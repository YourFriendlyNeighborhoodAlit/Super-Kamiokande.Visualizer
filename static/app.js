// static/app.js

document.addEventListener('DOMContentLoaded', () => {
    // Get the canvas and button elements
    const updateButton = document.getElementById('updateButton');
    const dataOutput = document.getElementById('dataOutput');
    const canvas = document.getElementById('glCanvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const originalImage = document.getElementById('originalImage'); // Get the image element

    // Check for WebGL support
    if (!gl) {
        // Use a modal-like message box instead of alert()
        dataOutput.textContent = 'Unable to initialize WebGL. Your browser or machine may not support it.';
        return;
    }

    // --- State variables for interactive controls ---
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    const rotationSpeed = 0.005; // Adjust rotation sensitivity

    // Store the camera's state
    let rotationX = 0;
    let rotationY = 0;
    let zoomZ = -30; // Initial zoom level, determines distance from the object

    // A variable to hold the last fetched event data for re-rendering
    let lastEventData = null;

    // --- mat4 library for 3D matrix operations ---
    // A simplified version of gl-matrix for our needs
    const mat4 = {
        create: () => new Float32Array(16),
        identity: (out) => {
            out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
            out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
            out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
            out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
            return out;
        },
        perspective: (out, fovy, aspect, near, far) => {
            const f = 1.0 / Math.tan(fovy / 2);
            out[0] = f / aspect;
            out[1] = 0; out[2] = 0; out[3] = 0;
            out[4] = 0;
            out[5] = f;
            out[6] = 0; out[7] = 0;
            out[8] = 0; out[9] = 0;
            out[10] = (near + far) / (near - far);
            out[11] = -1;
            out[12] = 0; out[13] = 0;
            out[14] = (2 * far * near) / (near - far);
            out[15] = 0;
            return out;
        },
        multiply: (out, a, b) => {
            let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
            let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
            let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
            let a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

            let b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
            let b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
            let b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
            let b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];

            out[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
            out[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
            out[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
            out[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
            out[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
            out[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
            out[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
            out[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
            out[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
            out[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
            out[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
            out[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
            out[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
            out[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
            out[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
            out[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;

            return out;
        },
        translate: (out, a, v) => {
            let x = v[0], y = v[1], z = v[2];
            let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
            let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
            let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
            out[0] = a00; out[1] = a01; out[2] = a02; out[3] = a03;
            out[4] = a10; out[5] = a11; out[6] = a12; out[7] = a13;
            out[8] = a20; out[9] = a21; out[10] = a22; out[11] = a23;
            out[12] = a00 * x + a10 * y + a20 * z + a[12];
            out[13] = a01 * x + a11 * y + a21 * z + a[13];
            out[14] = a02 * x + a12 * y + a22 * z + a[14];
            out[15] = a03 * x + a13 * y + a23 * z + a[15];
            return out;
        },
        rotate: (out, a, rad, axis) => {
            let x = axis[0], y = axis[1], z = axis[2];
            let len = Math.hypot(x, y, z);
            let s, c, t;
            let a00, a01, a02, a03;
            let a10, a11, a12, a13;
            let a20, a21, a22, a23;
            let b00, b01, b02, b03;
            let b10, b11, b12, b13;
            let b20, b21, b22, b23;

            if (len === 0) { return null; }
            len = 1 / len;
            x *= len;
            y *= len;
            z *= len;

            s = Math.sin(rad);
            c = Math.cos(rad);
            t = 1 - c;

            a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
            a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
            a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];

            // Construct rotation matrix (b)
            b00 = x * x * t + c;
            b01 = y * x * t + z * s;
            b02 = z * x * t - y * s;
            b10 = x * y * t - z * s;
            b11 = y * y * t + c;
            b12 = z * y * t + x * s;
            b20 = x * z * t + y * s;
            b21 = y * z * t - x * s;
            b22 = z * z * t + c;

            // Perform rotation of the a matrix by the b matrix
            out[0] = a00 * b00 + a10 * b01 + a20 * b02;
            out[1] = a01 * b00 + a11 * b01 + a21 * b02;
            out[2] = a02 * b00 + a12 * b01 + a22 * b02;
            out[3] = a03 * b00 + a13 * b01 + a23 * b02;
            out[4] = a00 * b10 + a10 * b11 + a20 * b12;
            out[5] = a01 * b10 + a11 * b11 + a21 * b12;
            out[6] = a02 * b10 + a12 * b11 + a22 * b12;
            out[7] = a03 * b10 + a13 * b11 + a23 * b12;
            out[8] = a00 * b20 + a10 * b21 + a20 * b22;
            out[9] = a01 * b20 + a11 * b21 + a21 * b22;
            out[10] = a02 * b20 + a12 * b21 + a22 * b22;
            out[11] = a03 * b20 + a13 * b21 + a23 * b22;

            if (a !== out) { // If the source and destination differ, copy translation
                out[12] = a[12];
                out[13] = a[13];
                out[14] = a[14];
                out[15] = a[15];
            }
            return out;
        },
    };

    // Vertex shader program
    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec4 aVertexColor;

        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;

        varying lowp vec4 vColor;

        void main(void) {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            gl_PointSize = 3.0; // Draw points as small squares
            vColor = aVertexColor;
        }
    `;

    // Fragment shader program
    const fsSource = `
        varying lowp vec4 vColor;

        void main(void) {
            gl_FragColor = vColor;
        }
    `;

    // Initialize a shader program, so WebGL knows how to draw our data
    function initShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return shaderProgram;
    }

    // Creates a shader of the given type, uploads the source and compiles it.
    function loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    // Initialize the shader program once
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    if (!shaderProgram) {
        console.error("Failed to initialize shader program, rendering aborted.");
        return;
    }

    // Get attribute and uniform locations
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    // --- Mouse event listeners for interaction ---
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mouseout', () => {
        isDragging = false;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        // Calculate deltas
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;

        // Update last mouse position
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        // Update rotation based on mouse movement
        rotationY += deltaX * rotationSpeed;
        rotationX += deltaY * rotationSpeed;

        // Re-render the scene if we have data
        if (lastEventData) {
            renderDetector(gl, programInfo, lastEventData);
        }
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault(); // Prevent page scrolling
        // Adjust zoom based on scroll direction
        zoomZ += e.deltaY * 0.01; // Slower zoom speed
        // Clamp zoom to prevent camera from going inside or too far away
        zoomZ = Math.min(zoomZ, -5);  // Closest zoom
        zoomZ = Math.max(zoomZ, -100); // Farthest zoom

        // Re-render the scene if we have data
        if (lastEventData) {
            renderDetector(gl, programInfo, lastEventData);
        }
    });

    // --- Main render function ---
    function renderDetector(gl, programInfo, eventData) {
        // Set up the WebGL context
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
        gl.clearDepth(1.0); // Clear everything
        gl.enable(gl.DEPTH_TEST); // Enable depth testing
        gl.depthFunc(gl.LEQUAL); // Near things obscure far things
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Get canvas dimensions dynamically for responsive design
        const canvasWidth = gl.canvas.clientWidth;
        const canvasHeight = gl.canvas.clientHeight;
        gl.canvas.width = canvasWidth;
        gl.canvas.height = canvasHeight;
        gl.viewport(0, 0, canvasWidth, canvasHeight);

        // --- Projection Matrix setup ---
        const aspect = canvasWidth / canvasHeight;
        const fieldOfView = 45 * Math.PI / 180; // in radians
        const zNear = 0.1;
        const zFar = 200.0; // Extend far plane to accommodate zoom
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

        // --- Model-View Matrix setup for interactive rotation and zoom ---
        const modelViewMatrix = mat4.create();
        mat4.identity(modelViewMatrix);

        // Apply translation (zoom) first
        mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, zoomZ]);

        // Then apply rotation to the object
        mat4.rotate(modelViewMatrix, modelViewMatrix, rotationX, [1, 0, 0]); // Rotate around X-axis
        mat4.rotate(modelViewMatrix, modelViewMatrix, rotationY, [0, 1, 0]); // Rotate around Y-axis

        // --- Prepare data for WebGL ---
        const hitPositions = [];
        const hitColors = [];

        // Detector dimensions for 3D space
        const detectorRadius = 5.0;
        const detectorHalfHeight = 5.0;

        // Define the crop regions based on the source image dimensions
        const barrelCrop = { x: 30, y: 291, width: 1190, height: 288 }; // Derived from the original code
        const ceilingCrop = { x: 453, y: 21, width: 410, height: 270 };
        const floorCrop = { x: 453, y: 579, width: 410, height: 270 };

        eventData.hits.forEach(hit => {
            let x3D, y3D, z3D;

            if (hit.region === 'barrel') {
                const normalizedX = hit.x / barrelCrop.width;
                const normalizedY = hit.y / barrelCrop.height;
                const angle = normalizedX * 2 * Math.PI; // Full circle
                z3D = detectorHalfHeight - (normalizedY * detectorHalfHeight * 2);
                x3D = detectorRadius * Math.cos(angle);
                y3D = detectorRadius * Math.sin(angle);
            } else if (hit.region === 'ceiling') {
                // CORRECTED: Map 2D ellipse coordinates directly to 3D circle coordinates
                const localX = hit.x - (ceilingCrop.width / 2);
                const localY = hit.y - (ceilingCrop.height / 2);

                // Re-corrected logic: The ceiling needs to be rotated 180 degrees
                // compared to the previous attempt.
                // Flip both x and y coordinates to achieve a 180-degree rotation
                x3D = (-localX / (ceilingCrop.width / 2)) * detectorRadius;
                y3D = (-localY / (ceilingCrop.height / 2)) * detectorRadius;
                z3D = detectorHalfHeight;

                // Check if the point is within the radius
                if (Math.hypot(x3D, y3D) > detectorRadius) {
                    return;
                }
            } else if (hit.region === 'floor') {
                // CORRECTED: Map 2D ellipse coordinates directly to 3D circle coordinates
                const localX = hit.x - (floorCrop.width / 2);
                const localY = hit.y - (floorCrop.height / 2);

                // Re-corrected logic: The floor needs to be rotated 90 degrees
                // This means mapping the crop's X to the 3D Y and vice-versa,
                // and flipping one of them.
                x3D = (localY / (floorCrop.height / 2)) * detectorRadius;
                y3D = (-localX / (floorCrop.width / 2)) * detectorRadius;
                z3D = -detectorHalfHeight;

                // Check if the point is within the radius
                if (Math.hypot(x3D, y3D) > detectorRadius) {
                    return;
                }
            } else {
                return;
            }

            hitPositions.push(x3D, y3D, z3D);
            hitColors.push(hit.color[0] / 255, hit.color[1] / 255, hit.color[2] / 255, 1.0);
        });

        if (hitPositions.length === 0) {
            console.warn("No valid hits to render after 2D to 3D transformation.");
            return;
        }

        // --- Create and fill WebGL buffers ---
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(hitPositions), gl.STATIC_DRAW);

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(hitColors), gl.STATIC_DRAW);

        // --- Bind buffers to attributes ---
        {
            const numComponents = 3;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        }

        {
            const numComponents = 4;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexColor,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
        }

        // Tell WebGL to use our program when drawing
        gl.useProgram(programInfo.program);

        // Set the shader uniforms
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);

        {
            const vertexCount = hitPositions.length / 3;
            gl.drawArrays(gl.POINTS, 0, vertexCount);
        }
    }

    // --- The update button click listener ---
    updateButton.addEventListener('click', async () => {
        dataOutput.textContent = 'Fetching and processing event data...';
        try {
            const updateResponse = await fetch('/update');
            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Server update failed with status ${updateResponse.status}: ${errorText}`);
            }

            // Update the GIF by appending a timestamp to the URL to bust the cache
            if (originalImage) {
                const timestamp = new Date().getTime();
                originalImage.src = `/static/latest_event.gif?t=${timestamp}`;
            }

            const dataResponse = await fetch('/latest/data');
            if (!dataResponse.ok) {
                const errorText = await dataResponse.text();
                throw new Error(`Failed to fetch latest data with status ${dataResponse.status}: ${errorText}`);
            }

            lastEventData = await dataResponse.json();
            dataOutput.textContent = 'Event data fetched and visualized.';

            renderDetector(gl, programInfo, lastEventData);
        } catch (error) {
            console.error('Error:', error);
            dataOutput.textContent = 'Error: ' + error.message;
        }
    });

    // Also need to handle window resizing to make the canvas responsive
    window.addEventListener('resize', () => {
        if (lastEventData) {
            renderDetector(gl, programInfo, lastEventData);
        }
    });
});
