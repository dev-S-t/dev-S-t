document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameOfLifeCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }
    const ctx = canvas.getContext('2d');

    // Configuration
    const resolution = 10; // Size of each cell in pixels
    let COLS, ROWS; // Number of columns and rows, will be calculated based on canvas size
    let grid;
    let animationFrameId;

    function setup() {
        // Adjust canvas logical size to its display size
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        COLS = Math.floor(canvas.width / resolution);
        ROWS = Math.floor(canvas.height / resolution);

        grid = buildGrid();
        randomizeGrid(grid);
        
        // Start the animation loop if it's not already running
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        gameLoop();
    }

    function buildGrid() {
        return new Array(COLS).fill(null)
            .map(() => new Array(ROWS).fill(0));
    }

    function randomizeGrid(currentGrid) {
        for (let col = 0; col < COLS; col++) {
            for (let row = 0; row < ROWS; row++) {
                currentGrid[col][row] = Math.random() > 0.85 ? 1 : 0; // Adjust probability for initial live cells
            }
        }
    }

    function gameLoop() {
        grid = nextGen(grid);
        drawGrid(grid);
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function nextGen(currentGrid) {
        const nextGrid = currentGrid.map(arr => [...arr]); // Create a copy of the grid

        for (let col = 0; col < COLS; col++) {
            for (let row = 0; row < ROWS; row++) {
                const cell = currentGrid[col][row];
                let numNeighbors = 0;
                for (let i = -1; i < 2; i++) {
                    for (let j = -1; j < 2; j++) {
                        if (i === 0 && j === 0) {
                            continue;
                        }
                        const x_cell = col + i;
                        const y_cell = row + j;

                        if (x_cell >= 0 && y_cell >= 0 && x_cell < COLS && y_cell < ROWS) {
                            numNeighbors += currentGrid[x_cell][y_cell];
                        }
                    }
                }

                // Rules of Life
                if (cell === 1 && numNeighbors < 2) {
                    nextGrid[col][row] = 0; // Loneliness
                } else if (cell === 1 && numNeighbors > 3) {
                    nextGrid[col][row] = 0; // Overpopulation
                } else if (cell === 0 && numNeighbors === 3) {
                    nextGrid[col][row] = 1; // Reproduction
                }
                // Otherwise, cell stays the same
            }
        }
        return nextGrid;
    }

    function drawGrid(currentGrid) {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
        ctx.fillStyle = '#000'; // Color of live cells

        for (let col = 0; col < COLS; col++) {
            for (let row = 0; row < ROWS; row++) {
                if (currentGrid[col][row] === 1) {
                    ctx.fillRect(col * resolution, row * resolution, resolution, resolution);
                }
            }
        }
    }

    // Initial setup
    setup();

    // Optional: Resize event listener to re-initialize the game if canvas size changes
    // This can be tricky with vw/vh units and frequent resizes, so use with caution or add debounce.
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            console.log('Resizing, re-initializing Game of Life...');
            setup(); // Re-initialize the game on window resize
        }, 250); // Debounce resize event
    });
});
