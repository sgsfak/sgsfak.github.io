/**
 * A Maze Generator for square mazes
 * 
 * You can use it like this:
 *     let m = new Maze(10); // Will create a 10x10 maze
 * 
 * You can also provide a set of options as an object:
 * 
 *     let m = new Maze({rows: 10, cols:30, algo: 'prim'})
 * 
 * The above will create a 10x30 maze using the Prim's algorithm for
 * the generation of the maze.
 * 
 * Stelios Sfakianakis, 2018
 */
   
var Maze = (function () {
    'use strict';

    /**
     * The Cell object represents a cell (room) of the maze. 
     * It is located in a specific row and col and
     * has a number of doors to other (neighboring) cells
     */
    class Cell {
        constructor(x, y) {
            this.row = x;
            this.col = y;
            this.doors = {};
        }

        neighbors() {
            let neighbors = {};
            for (let [dir, door] of Object.entries(this.doors)) {
                if (door.closed) continue;
                if (door.cell1 === this)
                    neighbors[dir] = door.cell2;
                else
                    neighbors[dir] = door.cell1;
            }
            return neighbors;
        }

        /**
         * What cells can be visited from this one? 
         * @returns Array The cells that can be visited from this (through its open doors)
         */
        canVisit() {
            return Object.values(this.neighbors());
        }
    }


    // The neighboring cells, even if there's no open door 
    // between them
    let _neighbors = function(cell) {
        let neighbors = [];
        for (let door of Object.values(cell.doors)) {
            if (door.cell1 === cell)
                neighbors.push(door.cell2);
            else
                neighbors.push(door.cell1);
        }
        return neighbors;
    }

    class Door {
        constructor(c1, c2) {
            const k = c1.row < c2.row || c1.row === c2.row && c1.col < c2.col;
            this.cell1 = k ? c1 : c2;
            this.cell2 = k ? c2 : c1;
            this.closed = true;
        }

        /**
         * Is it a vertical ('|') or horizontal ('-') door?
         */
        get direction() {
            return (this.cell1.row == this.cell2.row) ? '|' : '-'
        }
    }

    class MazeGenerator {
        constructor(config) {
            if (typeof config === 'number')
                config = {rows: config}
            config = config || {};
            this.rows = config.rows || 20;
            this.cols = config.cols || this.rows;
            this.algo = config.algo || 'recursive';

            // Create Cells (rooms)
            this.cells = new Array(this.rows);
            for (let x = 0; x < this.rows; ++x) {
                this.cells[x] = new Array(this.cols);
                for (let y = 0; y < this.cols; ++y) {
                    this.cells[x][y] = new Cell(x, y);
                }
            }

            // Create doors
            this.doors = new Array(this.rows * (this.cols - 1) + this.cols * (this.rows - 1));
            let k = 0;
            for (let x = 0; x < this.rows; ++x) {
                for (let y = 0; y < this.cols; ++y) {
                    let cell1 = this.cells[x][y];
                    if (x >= 1) {
                        // Add NORTH (up) door
                        let cell2 = this.cells[x - 1][y];
                        let door = new Door(cell1, cell2);
                        this.doors[k++] = door;
                        cell1.doors['up'] = door;
                        cell2.doors['down'] = door;
                    }
                    if (y >= 1) {
                        // Add WEST (left) door
                        let cell2 = this.cells[x][y - 1];
                        let door = new Door(cell1, cell2);
                        this.doors[k++] = door;
                        cell1.doors['left'] = door;
                        cell2.doors['right'] = door;
                    }
                }
            }
            randomizeMaze(this);
        }

        /**
         * Iterate over the cells of this maze, i.e
         * let m = new Maze(...)
         * for (let cell of m) {...} 
         */
        *[Symbol.iterator]() {
            for (let row of this.cells) {
                for (let cell of row) {
                    yield cell;
                }
            }
        }

        groupDoors() {
            return this.doors.reduce(function (acc, door) {
                acc[door.direction].push(door);
                return acc;
            }, {
                '|': [],
                '-': []
            });
        }

        solve(startCell, endCell) {
            let current = startCell;
            let path = new Array;
            let v = new Set;
            v.add(startCell);
            path.push(startCell);
            while (current !== endCell) {
                let u = current.canVisit().filter(n => !v.has(n));
                if (u.length) {
                    current = u[ Math.floor(Math.random() * u.length) ];
                    v.add(current);
                    path.push(current);
                }
                else {
                    if (path.length === 0)
                        throw new Error(`Cannot find a way from ${startCell} to ${endCell}!!`);
                    path.pop();
                    current = path[ path.length - 1 ];
                }
            }
            return path;
        }
    }

    function randomizeMaze(maze) {
        switch (maze.algo) {
            case 'prim':createRandomMazePrim(maze); break;
            case 'kruskal':createRandomMazeKruskal(maze); break;
            default: createRandomMazeRec(maze); break;
        }
    }

    function createRandomMazeRec(maze) {
        let i = Math.floor(Math.random()*maze.rows);
        let j = Math.floor(Math.random()*maze.cols);
        let cell = maze.cells[i][j];
        let v = new Set;
        let stack = new Array;
        while(true) {
            let u = _neighbors(cell).filter(n=>!v.has(n));
            if (u.length) {
                let n = u[ Math.floor(u.length * Math.random()) ];
                let d = Object.values(n.doors).find(d => d.cell1 === cell || d.cell2 === cell);
                d.closed = false;
                stack.push(cell);
                cell = n;
                v.add(n);
            }
            else {
                if (!stack.length)
                    return;
                cell = stack.pop();
            }
        }
    }

    function createRandomMazePrim(maze) {
        let i = Math.floor(Math.random()*maze.rows);
        let j = Math.floor(Math.random()*maze.cols);
        let cell = maze.cells[i][j];
        let walls = Object.values(cell.doors);
        const pickWall = function() {
            let last = walls.length-1;
            let k = Math.floor( (last+1)*Math.random());
            let tmp = walls[k];
            walls[k] = walls[last];
            walls[last] = tmp;
            return walls.pop();
        }
        let v = new Set;
        v.add(cell);
        while(walls.length) {
            let w = pickWall();
            if (v.has(w.cell1) && v.has(w.cell2))
                continue;
            w.closed = false;
            let unvisited = v.has(w.cell1) ? w.cell2 : w.cell1;
            v.add(unvisited);
            for(let d of Object.values(unvisited.doors)) {
                walls.push(d);
            }
        }
    }

    function createRandomMazeKruskal(maze) {
        random_shuffle(maze.doors);
        let uf = new UF;
        for (let d of maze.doors) {
            if (!uf.joined(d.cell1, d.cell2)) {
                d.closed = false;
                uf.join(d.cell1, d.cell2);
            }
        }
    }

    /* Utility functions */

    // The Fisher-Yates shuffle:
    // https://en.wikipedia.org/wiki/Fisher–Yates_shuffle
    function random_shuffle(arr) {
        for (let n = arr.length; n > 1; n--) {
            let k = Math.floor(Math.random() * n);
            let tmp = arr[n - 1]
            arr[n - 1] = arr[k];
            arr[k] = tmp;
        }
        return arr;
    }

    // the 'union-find' algorithm (disjoint set data structure):
    // https://en.wikipedia.org/wiki/Disjoint-set_data_structure
    class UF {
        constructor() {
            this.m = new Map;
        }

        rootsNbr() {
            let s = new Set;
            this.m.forEach(p => s.add(this.root(p)) );
            return s.size;
        }

        root(p) {
            if (!this.m.has(p))
                this.m.set(p, p);
            while(p !== this.m.get(p)) {
                // path halving
                let par = this.m.get(p); 
                let ppar = this.m.get(par)
                this.m.set(p, ppar);
                p = ppar;
            }
            return p;
        }

        join(p,q) {
            let rp = this.root(p);
            let rq = this.root(q);
            if (rp === rq)
                return;
            this.m.set(rp, rq);
        }

        joined(p,q) {
            let rp = this.root(p);
            let rq = this.root(q);
            return (rp === rq);
        }
    }

    return MazeGenerator;
})();