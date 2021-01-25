const BLACK = rgb(0, 0, 0);
const WHITE = rgb(255, 255, 255);
const YELLOW = rgb(255, 255, 100);
const RED = rgb(255, 0, 0);
const GREEN = rgb(0, 255, 0);
const BLUE = rgb(0, 0, 255);

let MODEL;

let frame = document.getElementById('frame');
let context = frame.getContext('2d');
const surface = context.createImageData(frame.width, frame.height);
const framebuffer = makeBuffer(frame.width*frame.height, BLACK);

document.addEventListener('keydown', function(e) {
  if(e.code == 'KeyR') {
    draw();
  }
});

function init() {
  fetchText('https://raw.githubusercontent.com/ssloy/tinyrenderer/f6fecb7ad493264ecd15e230411bfb1cca539a12/obj/african_head.obj')
    .then((text) => {
      MODEL = parseObj(text);
      console.log(`loaded ${MODEL.vertices.length} vertices and ${MODEL.faces.length} faces`);
      draw();
    });
}

function draw() {
  let start = new Date().getTime();
  clear(framebuffer, BLACK);
  for(let i = 0; i < MODEL.faces.length; i++) {
    let face = MODEL.faces[i];
    let v0 = MODEL.vertices[face.v0i];
    let x0 = Math.floor((v0.x + 1) / 2 * frame.height);
    let y0 = frame.height - Math.floor((v0.y + 1) / 2 * frame.height);
    let v1 = MODEL.vertices[face.v1i];
    let x1 = Math.floor((v1.x + 1) / 2 * frame.height);
    let y1 = frame.height - Math.floor((v1.y + 1) / 2 * frame.height);
    let v2 = MODEL.vertices[face.v2i];
    let x2 = Math.floor((v2.x + 1) / 2 * frame.height);
    let y2 = frame.height - Math.floor((v2.y + 1) / 2 * frame.height);
    wireTriangle(x0, y0, x1, y1, x2, y2, WHITE, framebuffer, frame.width);
  }
  let endDraw = new Date().getTime();
  blit(framebuffer);
  let end = new Date().getTime();
  console.log(`Total: ${end-start}, Draw: ${endDraw-start}`);
}

function scanlineTriangle(x0, y0, x1, y1, x2, y2, color, buffer, width) {
  color = color * Math.random();
  // sort vertices vertically
  if(y0 > y1) {
    let swapY = y0; y0 = y1; y1 = swapY;
    let swapX = x0; x0 = x1; x1 = swapX;
  }
  if(y0 > y2) {
    let swapY = y0; y0 = y2; y2 = swapY;
    let swapX = x0; x0 = x2; x2 = swapX;
  }
  if(y1 > y2) {
    let swapY = y1; y1 = y2; y2 = swapY;
    let swapX = x1; x1 = x2; x2 = swapX;
  }
  let totalHeight = y2-y0;
  // draw bottom of triangle
  for(let y = y0; y <= y1; y++) {
    let segmentHeight = y1-y0+1;
    let a = (y-y0)/totalHeight;
    let b = (y-y0)/segmentHeight;
    let ax = x0 + (x2-x0) * a;
    let bx = x0 + (x1-x0) * b;
    if(ax > bx) {
      let swap = ax; ax = bx; bx = swap;
    }
    ax = Math.floor(ax);
    bx = Math.ceil(bx);
    for(let x = ax; x < bx; x++) {
      buffer[x+y*width] = color;
    }
  }
  // draw top of triangle
  for(let y = y1; y <= y2; y++) {
    let segmentHeight = y2-y1+1;
    let a = (y-y0)/totalHeight;
    let b = (y-y1)/segmentHeight;
    let ax = x0 + (x2-x0) * a;
    let bx = x1 + (x2-x1) * b;
    if(ax > bx) {
      let swap = ax; ax = bx; bx = swap;
    }
    ax = Math.floor(ax);
    bx = Math.ceil(bx);
    for(let x = ax; x < bx; x++) {
      buffer[x+y*width] = color;
    }
  }
}

function wireTriangle(x0, y0, x1, y1, x2, y2, color, buffer, width) {
  line(x0, y0, x1, y1, color, buffer, width);
  line(x1, y1, x2, y2, color, buffer, width);
  line(x2, y2, x0, y0, color, buffer, width);
}

function line(x0, y0, x1, y1, color, buffer, width) {
  let isSteep = false;
  if(Math.abs(x0-x1) < Math.abs(y0-y1)) {
    isSteep = true;
    let swap0 = x0; x0 = y0; y0 = swap0;
    let swap1 = x1; x1 = y1; y1 = swap1;
  }
  if(x0 > x1) {
    let swapX = x0; x0 = x1; x1 = swapX;
    let swapY = y0; y0 = y1; y1 = swapY;
  }
  let dx = x1-x0;
  let dy = y1-y0;
  let derror = Math.abs(dy) * 2;
  let error = 0;
  let y = y0;
  let yinc = (y1>y0) ? 1 : -1;
  for(let x = x0; x <= x1; x++) {
    if(isSteep) {
      buffer[y+x*width] = color;
    }else{
      buffer[x+y*width] = color;
    }
    error += derror;
    if(error > dx) {
      y += yinc;
      error -= dx*2;
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
    surface.data[p+0] = (color >> 16) & 0xFF;
    surface.data[p+1] = (color >> 8) & 0xFF;
    surface.data[p+2] = (color >> 0) & 0xFF;
    surface.data[p+3] = 255;
  }
  context.putImageData(surface, 0, 0);
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

/**
 * Convert a tuple (r,g,b) into an integer representation of that color that can
 * be stored in a buffer.
 * @param {Number} red 8-bit red value
 * @param {Number} green 8-bit green value
 * @param {Number} blue 8-bit blue value
 * @returns {Number} a 24-bit integer representing the (r,g,b) tuple
 */
function rgb(red, green, blue) {
  return (red << 16) | (green << 8) | (blue << 0);
}

function parseObj(text) {
  let vertices = [];
  let faces = [];
  for(let ln of text.split('\n')) {
    if(ln.startsWith('v')) {
      let vtext = ln.split(' ');
      let x = +vtext[1];
      let y = +vtext[2];
      let z = +vtext[3];
      vertices.push({ x, y, z });
    }
    if(ln.startsWith('f')) {
      let words = ln.split(' ');
      let v0i = +words[1].split('/')[0]-1;
      let v1i = +words[2].split('/')[0]-1;
      let v2i = +words[3].split('/')[0]-1;
      faces.push({ v0i, v1i, v2i });
    }
  }
  return { vertices, faces };
}

async function fetchText(url) {
  let res = await fetch(url);
  let text = await res.text();
  return text;
}