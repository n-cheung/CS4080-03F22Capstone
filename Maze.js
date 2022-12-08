// game config
const mazeWidth = 10, mazeHeight = 10;
const minTileSize = 50;
const spriteScale = 1;
const playerSpriteURL = 'https://i.postimg.cc/63zypcsN/horse.png';
const goalSpriteURL = 'https://i.postimg.cc/7YPS0Bwd/cpp-logo.png';

// begin backend

// game scope
const Game = function () {
    const top = document.getElementById('top');
    const bgdiv = document.getElementById('bg');
    const victory = document.getElementById('victory');

    const reference = document.getElementById('reference');
    const holder = document.getElementById('holder');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // generate random int range [min, max)
    function randRange(a1, a2) {
        const [min, max] = (() =>
            a2 === undefined || a2 == null
                ? [0, a1]
                : [a1, a2]
        ) ();

        return Math.floor(Math.random() * (max - min)) + min;
    }

    // directional information
    const directions = function () {
        // hidden key sets for faster input checking
        const keySets = {
            w: undefined,
            n: undefined,
            e: undefined,
            s: undefined,
        };

        class Directions {
            // all directions as an array
            array = [];
            // list of direction keys
            keys = ['w', 'n', 'e', 's'];

            constructor() {
                this.w = this.n = this.e = this.s = undefined;
            }

            // checks if an input key is associated with a direction, returning it if so
            checkInput(key) {
                for (const dir of this.array)
                    if (dir.isInput(key))
                        return dir;

                return undefined;
            }
        }
        const directions = new Directions();

        class Direction {
            constructor(self, opp, xmod, ymod, keyValues) {
                const dir = self;
                keySets[dir] = new Set(keyValues);
                directions.array.push(this);

                this.self = dir;
                this.opp = opp;
                this.xmod = xmod;
                this.ymod = ymod;

                // checks if an input is associated with this direction
                this.isInput = key => keySets[dir].has(key);
            }
        }

        directions.w = new Direction('w', 'e', -1, 0, ['a', 'A', 'ArrowLeft']);
        directions.n = new Direction('n', 's', 0, -1, ['w', 'W', 'ArrowUp']);
        directions.e = new Direction('e', 'w', 1, 0, ['d', 'D', 'ArrowRight']);
        directions.s = new Direction('s', 'n', 0, 1, ['s', 'S', 'ArrowDown']);

        return directions;
    }();

    const dirtyTiles = new Set();
    // root class for drawable object
    class Drawable {
        static offset = { x: undefined, y: undefined };

        realPos = { x: undefined, y: undefined };

        // method to recalculate the values needed for drawing
        calc() { }

        // method to mark object as needing to be redrawn
        dirty() { }

        // method to draw the object
        draw() { }
    };

    let tiles = [];
    class Tile extends Drawable {
        static size = 0;
        static strokeOffset = undefined;
        static lineWidth = undefined;

        constructor(x, y) {
            super();

            this.x = x;
            this.y = y;

            this.w = this.n = this.e = this.s = false;
            this.offset = { x: undefined, y: undefined };
            this.strokeStart = { x: undefined, y: undefined };
            this.strokeEnd = { x: undefined, y: undefined };

            this.visited = false;
        }

        // gets the tile at the position with the given mods
        // returns the tile if possible 
        translate(xmod, ymod) {
            const x = this.x + xmod;
            const y = this.y + ymod;

            if (x < 0 || y < 0)
                return undefined;
            if (x >= mazeWidth || y >= mazeHeight)
                return undefined;

            if (!tiles[x])
                return undefined;

            return tiles[x][y];
        }

        // gets adjacent tile in the given direction
        // returns adjacent tile if possible
        next(dir) {
            return this.translate(dir.xmod, dir.ymod);
        }

        open(dir) {
            if (this[dir.self] === undefined)
                return false;

            const next = this.next(dir);
            if (next === undefined || next[dir.opp] === undefined)
                return false;
            return this[dir.self] = next[dir.opp] = true;
        }

        calc() {
            [this.realPos.x, this.realPos.y] = [this.x * Tile.size + Drawable.offset.x, this.y * Tile.size + Drawable.offset.y];
            [this.offset.x, this.offset.y] = [this.realPos.x + Tile.size, this.realPos.y + Tile.size];
            [this.strokeStart.x, this.strokeStart.y] = [this.realPos.x - Tile.strokeOffset, this.realPos.y - Tile.strokeOffset];
            [this.strokeEnd.x, this.strokeEnd.y] = [this.offset.x + Tile.strokeOffset, this.offset.y + Tile.strokeOffset];
        }

        dirty() {
            dirtyTiles.add(this);
        }

        draw() {
            // corner squares
            ctx.fillRect(this.realPos.x, this.realPos.y, Tile.strokeOffset, Tile.strokeOffset);
            ctx.fillRect(this.realPos.x, this.realPos.y+Tile.size-Tile.strokeOffset, Tile.strokeOffset, Tile.strokeOffset);
            ctx.fillRect(this.realPos.x+Tile.size-Tile.strokeOffset, this.realPos.y, Tile.strokeOffset, Tile.strokeOffset);
            ctx.fillRect(this.realPos.x+Tile.size-Tile.strokeOffset, this.realPos.y+Tile.size-Tile.strokeOffset, Tile.strokeOffset, Tile.strokeOffset);

            if (!this.n)
                ctx.fillRect(this.realPos.x, this.realPos.y, Tile.size, Tile.strokeOffset);
            if (!this.w)
                ctx.fillRect(this.realPos.x, this.realPos.y, Tile.strokeOffset, Tile.size);

            if (!this.s)
                ctx.fillRect(this.realPos.x, this.realPos.y+Tile.size-Tile.strokeOffset, Tile.size, Tile.strokeOffset);
            if (!this.e)
                ctx.fillRect(this.realPos.x+Tile.size-Tile.strokeOffset, this.realPos.y, Tile.strokeOffset, Tile.size);

            /*
            ctx.beginPath();
            ctx.lineWidth = Tile.lineWidth;
            if (!this.n) {
                ctx.moveTo(this.strokeStart.x, this.realPos.y);
                ctx.lineTo(this.strokeEnd.x, this.realPos.y);
                ctx.stroke();
            }
            if (!this.s) {
                ctx.moveTo(this.strokeStart.x, this.offset.y);
                ctx.lineTo(this.strokeEnd.x, this.offset.y);
                ctx.stroke();
            }
            if (!this.e) {
                ctx.moveTo(this.offset.x, this.strokeStart.y);
                ctx.lineTo(this.offset.x, this.strokeEnd.y);
                ctx.stroke();
            }
            if (!this.w) {
                ctx.moveTo(this.realPos.x, this.strokeStart.y);
                ctx.lineTo(this.realPos.x, this.strokeEnd.y);
                ctx.stroke();
            }*/
        }

        // clears the tile
        clear() {
            ctx.clearRect(this.realPos.x, this.realPos.y, Tile.size, Tile.size);
        }
    }

    // trackers for created resources and loaded to know when game can start
    let totalResources = 0;
    let loadedResources = 0;
    const entities = [];
    // game actor class that has an associated sprite
    class Entity extends Drawable {
        static offset = { x: undefined, y: undefined };
        static realPosCenter = { x: undefined, y: undefined };
        static size = 0;

        constructor(spriteURL) {
            totalResources++;
            super();

            // prepare image for loading
            const image = new Image();
            this.image = image;

            this.iwidth = undefined;
            this.iheight = undefined;
            image.src = spriteURL + '?' + new Date().getTime();
            image.setAttribute('crossOrigin', '*');
            // callback when image is loaded
            image.onload = () => {
                loadedResources++;
                this.iwidth = image.width;
                this.iheight = image.height;
            };

            this.tile = undefined;
            this.realPos = { x: undefined, y: undefined };

            entities.push(this);
        }

        // set the tile of this entity directly
        setTile(tile) {
            this.dirty();
            this.tile = tile;
            this.dirty();
        }

        // move the entity to given direction if possible
        // return success status
        move(dir) {
            if (this.tile === undefined || !this.tile[dir.self])
                return false;

            const nextTile = this.tile.next(dir);
            if (nextTile === undefined)
                return false;

            this.dirty();
            this.tile = nextTile;
            this.dirty();

            return true;
        }

        calc() {
            this.realPos.x = this.tile.x * Tile.size + Entity.offset.x;
            this.realPos.y = this.tile.y * Tile.size + Entity.offset.y;
        }

        dirty() {
            if (this.tile)
                this.tile.dirty();
        }

        draw() {
            ctx.drawImage(this.image, this.realPos.x, this.realPos.y, Entity.size, Entity.size);
        }
    };

    let cachedWidth = 0, cachedHeight = 0;

    const goalEntity = new Entity(goalSpriteURL);
    const playerEntity = new Entity(playerSpriteURL);
    let playerCanMove = false;
    let playerTotalMoves = 0;

    function handleVictory() {
        playerCanMove = false;
        document.getElementById("moves").innerHTML = playerTotalMoves;
        document.getElementById('victory').style.visibility = 'visible';
    }

    function prepareNewMaze(width, height) {
        playerCanMove = false;
        prepareTiles(width, height);
        prepareEntities();
        preparePath();

        playerTotalMoves = 0;
        requestAnimationFrame(gameRedraw);
        playerCanMove = true;
    }

    // prepares tile array with given width and height
    function prepareTiles() {
        // initialize tiles
        /*
        tiles = new Array(mazeWidth);
        for (let x = 0; x < mazeWidth; x++) {
            const row = new Array(mazeHeight);
            tiles[x] = row;
            for (let y = 0; y < mazeHeight; y++) {
                row[y] = new Tile(x, y);
            }
        }*/
        tiles = Array.apply(null, Array(mazeWidth)).map((_, x) =>
            Array.apply(null, Array(mazeHeight)).map((_, y) =>
                new Tile(x, y)
            )
        );
    };

    // sets tiles of game entities in opposite corners
    function prepareEntities() {
        // determine player and goal tiles
        const [playerTile, goalTile] = (() => {
            const x = randRange(2) == 0 ? [0, mazeWidth - 1] : [mazeWidth - 1, 0];
            const y = randRange(2) == 0 ? [0, mazeHeight - 1] : [mazeHeight - 1, 0];

            return [tiles[x[0]][y[0]], tiles[x[1]][y[1]]];
        }) ();

        playerTile.visited = true;
        playerEntity.setTile(playerTile);
        goalEntity.setTile(goalTile);
    }

    // uses fisher yate to generate a shuffled direction array
    function genShuffledDirections() {
        const array = [...directions.array];
        let i = array.length;
        while (i > 0) {
            const j = randRange(i--);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // create maze path through backtracking
    function preparePath() {
        const tileStack = [];
        let tileCount = 0;
        let remaining = mazeWidth * mazeHeight - 1;

        // push a new tile with shuffled direction array to work stack
        function pushTile(tile) {
            tileStack.push({ tile: tile, dirs: genShuffledDirections(), dirsCount: 4 })
            tileCount++;
        }
        // pop tile from stack, need to do this because length keeps
        // track of size of array, not the last entry
        function popTile() {
            tileCount--;
            return tileStack.pop();
        }
        function peekTile() {
            return tileStack[tileCount - 1];
        }

        function step() {
            const current = peekTile();
            if (current === undefined)
                throw new TypeError('Tile stack empty when not all tiles were visited.');

            const { tile, dirs } = current;

            let dir;
            while (dir = dirs.pop()) {
                current.dirsCount--;

                const nextTile = tile.next(dir);
                // skip if no tile or already visited
                if (!nextTile || nextTile.visited)
                    continue;

                // check if dirs empty, remove from stack
                if (current.dirsCount == 0)
                    popTile();

                // valid tile found, add to stack and continue to that one
                nextTile.visited = true;
                tile.open(dir);
                pushTile(nextTile);
                remaining--;
                return;
            }

            // reached if no more dirs, pop
            popTile();
        }

        // loop until no unvisited tiles remain
        pushTile(playerEntity.tile);
        while (remaining > 0)
            step();
    }

    // redraw entire canvas
    function gameRedraw() {
        dirtyTiles.clear();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const entity of entities) {
            entity.calc();
            entity.draw();
        }
        for (const row of tiles) {
            for (const tile of row) {
                tile.calc();
                tile.draw();
            }
        }
    }

    // draw only what is needed
    function gameDraw() {
        for (const tile of dirtyTiles) {
            tile.clear();
        }
        for (const entity of entities) {
            entity.calc();
        }

        for (const entity of entities) {
            entity.draw();
        }
        for (const tile of dirtyTiles) {
            tile.draw();
        }
        dirtyTiles.clear();
    }

    function handleWindowChange() {
        // verify if window changed sizes
        if (cachedWidth ==  window.innerWidth && cachedHeight == window.innerHeight)
            return;

        // update cache values
        [cachedWidth, cachedHeight] = [ window.innerWidth, window.innerHeight];
        //holder.style.minWidth = reference.style.minWidth = (minTileSize * mazeWidth) + 'px';
        //holder.style.minHeight = reference.style.minHeight = (minTileSize * mazeHeight) + 'px';
        const doubleTopHeight = top.clientHeight * 2;

        // calculate size of tile
        const hunit = cachedWidth / mazeWidth;
        const vunit = (cachedHeight - doubleTopHeight) / mazeHeight;
        const tileCheck = Math.max(minTileSize, Math.min(vunit, hunit));

        // if already at min size quit
        if (tileCheck <= Tile.size && Tile.size == minTileSize)
            return;
        Tile.size = tileCheck;

        // calculate usable canvas space
        const calculatedWidth = Math.floor(Tile.size * mazeWidth);
        const calculatedHeight = Math.floor(Tile.size * mazeHeight);

        canvas.width = calculatedWidth;
        canvas.height = calculatedHeight;

        holder.style.width = canvas.width + 'px';
        holder.style.height = canvas.height + 'px';
        victory.style.minWidth = bgdiv.style.minWidth = document.body.style.minWidth =  document.body.style.minWidth = (canvas.width + Math.floor(Tile.size / 4)) + 'px';
        victory.style.minHeight = bgdiv.style.minHeight = document.body.style.minHeight = (canvas.height + doubleTopHeight) + 'px';

        // recalculate tile size with floored value
        Tile.size = calculatedWidth / mazeWidth;

        // update values for wall drawing
        Tile.strokeOffset = Tile.size / 28;
        Tile.lineWidth = Tile.strokeOffset * 2;

        // calculate entity drawing values
        Entity.offset.x = Entity.offset.y = Tile.size * (1 - spriteScale) / 2;
        Entity.size = Tile.size * spriteScale;

        // calculate offsets to center the game
        Drawable.offset.x = (calculatedWidth - canvas.clientWidth) / 2;
        Drawable.offset.y = (calculatedHeight - canvas.clientHeight) / 2;

        Entity.offset.x += Drawable.offset.x;
        Entity.offset.y += Drawable.offset.y;

        requestAnimationFrame(gameRedraw);
    }
    
    // handles keypresses
    function keyDownHandler(e) {
        if (!playerCanMove)
            return;

        const dir = directions.checkInput(e.key);
        // handle move only if dir was found and player can move that way
        if (dir && playerEntity.move(dir)) {
            playerTotalMoves++;
            requestAnimationFrame(gameDraw);

            if (playerEntity.tile == goalEntity.tile)
                handleVictory();
        }
    }

    // checks if all resousces are load
    function isReady() {
        return totalResources == loadedResources;
    }

    function newGame() {
        document.getElementById('victory').style.visibility = 'hidden';
        prepareNewMaze(mazeWidth, mazeHeight);
    }

    // Wait for sprites to load before starting
    const checkInterval = setInterval(() => {
        // all sprites loaded, start new game
        if (isReady()) {
            clearInterval(checkInterval);

            newGame();
            handleWindowChange();

            window.onresize = handleWindowChange;
        }
    }, 100);

    window.addEventListener('keydown', keyDownHandler);
    document.getElementById('button').onclick = newGame;
    document.getElementById('button2').onclick = newGame;
};

window.onload = setTimeout(Game, 100);