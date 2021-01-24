let frame = document.getElementById('frame');
let context = frame.getContext('2d');
const WIDTH = frame.width;
const HEIGHT = frame.height;
const img = context.createImageData(WIDTH, HEIGHT);

const BLACK = fromRgb(0, 0, 0);
const WHITE = fromRgb(255, 255, 255);
const YELLOW = fromRgb(255, 255, 100);
const RED = fromRgb(255, 0, 0);
const GREEN = fromRgb(0, 255, 0);
const BLUE = fromRgb(0, 0, 255);

const framebuffer = makeBuffer(WIDTH*HEIGHT, BLACK);

document.addEventListener('keydown', function(e) {
  if(e.code == 'KeyR') {
    draw();
  }
});

let MODEL;
fetchObj('https://raw.githubusercontent.com/ssloy/tinyrenderer/f6fecb7ad493264ecd15e230411bfb1cca539a12/obj/african_head.obj')
  .then((obj) => {
    console.log(`loaded ${obj.vertices.length} vertices and ${obj.faces.length} faces`)
    MODEL = obj;
    draw();
  });


function draw() {
  let start = new Date().getTime();
  clear(framebuffer, BLACK);
  for(let i = 0; i < MODEL.faces.length; i++) {
    let face = MODEL.faces[i];
    let triangle = {
      v1: MODEL.vertices[face.v1i],
      v2: MODEL.vertices[face.v2i],
      v3: MODEL.vertices[face.v3i]
    };
    bresenhamWireframe(triangle, YELLOW, framebuffer, WIDTH);
  }
  blit(framebuffer);
  let end = new Date().getTime();
  console.log(end-start);
}

async function fetchObj(url) {
  let res = await fetch(url);
  let text = await res.text();
  let vertices = [];
  let faces = [];
  for(let ln of text.split('\n')) {
    if(ln.startsWith('v')) {
      let vtext = ln.split(' ');
      let x = (+vtext[1] + 1)/2 * HEIGHT;
      let y = HEIGHT-((+vtext[2] + 1)/2 * HEIGHT);
      let z = (+vtext[3] + 1);
      vertices.push({ x, y, z });
    }
    if(ln.startsWith('f')) {
      let words = ln.split(' ');
      let v1i = +words[1].split('/')[0]-1;
      let v2i = +words[2].split('/')[0]-1;
      let v3i = +words[3].split('/')[0]-1;
      faces.push({ v1i, v2i, v3i });
    }
  }
  return { vertices, faces };
}

function bresenhamLine(v0, v1, color, buffer, width) {
  let isSteep = false;
  let x0 = Math.floor(v0.x);
  let y0 = Math.floor(v0.y);
  let x1 = Math.floor(v1.x);
  let y1 = Math.floor(v1.y);
  if(Math.abs(x0-x1) < Math.abs(y0-y1)) {
    isSteep = true;
    let swap0 = x0; x0 = y0; y0 = swap0;
    let swap1 = x1; x1 = y1; y1 = swap1;
  }
  if(x0 > x1) {
    let swapX = x0; x0 = x1; x1 = swapX;
    let swapY = y0; y0 = y1; y1 = swapY;
  }
  let lineWidth = x1-x0;
  for(let x = x0; x <= x1; x++) {
    let t = (x-x0) / lineWidth;
    let y = Math.floor(y0*(1-t) + y1*t);
    if(isSteep) {
      buffer[y+x*width] = color;
    }else{
      buffer[x+y*width] = color;
    }
  }
}

function naiveLine(v1, v2, color, buffer, width) {
  let v1x = v1.x;
  let v1y = v1.y;
  let v2x = v2.x;
  let v2y = v2.y;   
  for(let t = 0; t < 1; t += 0.1) {
    let x = Math.floor(v1x + (v2x-v1x) * t);
    let y = Math.floor(v1y + (v2y-v1y) * t);
    buffer[x+y*width] = color;
  }
}

function bresenhamWireframe(triangle, color, buffer, width) {
  bresenhamLine(triangle.v1, triangle.v2, color, buffer, width);
  bresenhamLine(triangle.v2, triangle.v3, color, buffer, width);
  bresenhamLine(triangle.v3, triangle.v1, color, buffer, width);
}

/**
 * Draw a triangle using three linear equations. This function assumes the 
 * triangle is acute, that its vertices are not axis-aligned, that the triangle
 * is not degenerate, that anti-aliasing is not required, that the vertices are 
 * provided in a counter-clockwise winding order, and that pixels should be lit
 * only if the center of the pixel falls within the triangle. In other words, 
 * it's not a good function.
 * @param {Object} triangle Triangle to rasterize
 * @param {Number} color color to draw triangle with
 * @param {Number[]} buffer buffer to rasterize into
 * @param {Number} width width of buffer
 * @param {Number} height height of buffer
 */
function naiveTriangle(triangle, color, buffer, width, height) {
  let v0 = triangle[0];
  let v1 = triangle[1];
  let v2 = triangle[2];
  let x0 = v0.x;
  let y0 = v0.y;
  let x1 = v1.x;
  let y1 = v1.y;
  let x2 = v2.x;
  let y2 = v2.y;
// y-y1 = m(x-x1)
// y = mx - mx1 + y1
// b = -mx1 + y1
  let m1 = (y0 - y1) / (x0 - x1);
  let b1 = (-m1 * x0 + y0);
  let m2 = (y0 - y2) / (x0 - x2);
  let b2 = (-m2 * x0 + y0);
  let m3 = (y1 - y2) / (x1 - x2);
  let b3 = (-m3 * x1 + y1);
  for(let y = 0; y < height; y++) {
    for(let x = 0; x < width; x++) {
      let yy = y+0.5;
      let xx = x+0.5;
      if((yy > m1 * xx + b1) && (yy < m2 * xx + b2) && (yy < m3 * xx + b3)) {
        buffer[x+y*width] = color;
      }
    }
  }
}

/**
 * Blit a framebuffer to the screen.
 * @param {Number[]} framebuffer 
 * @param {Number} width 
 * @param {Number} height 
 */
function blit(buffer) {
  for(let i = 0; i < buffer.length; i++) {
    let p = i*4;
    let color = buffer[i];
    img.data[p+0] = (color >> 16) & 0xFF;
    img.data[p+1] = (color >> 8) & 0xFF;
    img.data[p+2] = (color >> 0) & 0xFF;
    img.data[p+3] = 255;
  }
  context.putImageData(img, 0, 0);
}

/**
 * Convert a tuple (r,g,b) into an integer representation of that color that can
 * be stored in a buffer.
 * @param {Number} red 8-bit red value
 * @param {Number} green 8-bit green value
 * @param {Number} blue 8-bit blue value
 * @returns {Number} a 24-bit integer representing the (r,g,b) tuple
 */
function fromRgb(red, green, blue) {
  return (red << 16) | (green << 8) | (blue << 0);
}

/**
 * Convert a 24-bit integer stored in a buffer into an (r,g,b) tuple.
 * @param {Number} color a 24-bit integer representing an (r,g,b) tuple
 * @returns {Object} an (r,g,b) tuple
 */
function toRgb(color) {
  return {
    r: (color >> 16) & 0xFF,
    g: (color >> 8) & 0xFF,
    b: (color >> 0) & 0xFF
  };
}

/**
 * Clear a buffer with a specified value.
 * @param {Number[]} buffer 
 * @param {Number} clearValue 
 */
function clear(buffer, clearValue) {
  buffer.fill(clearValue);
}

/**
 * Create a buffer of a given size populated with an initial value
 * @param {Number} size 
 * @param {Number} initialValue 
 * @returns {Number[]} a new buffer
 */
function makeBuffer(size, initialValue) {
  const buffer = [];
  for(let i = 0; i < size; i++) {
    buffer.push(initialValue);
  }
  return buffer;
}