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
    let triangle = {
      v0: MODEL.vertices[face.v0i],
      v1: MODEL.vertices[face.v1i],
      v2: MODEL.vertices[face.v2i]
    };
    if(Math.random() > 0.66) {
      wireframe(triangle, WHITE, framebuffer, frame.width);
    }else if(Math.random() > 0.5) {
      wireframe(triangle, GREEN, framebuffer, frame.width);
    }else{
      wireframe(triangle, BLUE, framebuffer, frame.width);
    }
  }
  let endDraw = new Date().getTime();
  blit(framebuffer);
  let end = new Date().getTime();
  console.log(`Total: ${end-start}, Draw: ${endDraw-start}`);
}

function wireframe(triangle, color, buffer, width) {
  line(triangle.v0, triangle.v1, color, buffer, width);
  line(triangle.v1, triangle.v2, color, buffer, width);
  line(triangle.v2, triangle.v0, color, buffer, width);
}

function line(v0, v1, color, buffer, width) {
  let isSteep = false;
  let x0 = Math.round(v0.x);
  let y0 = Math.round(v0.y);
  let x1 = Math.round(v1.x);
  let y1 = Math.round(v1.y);
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
      let x = (+vtext[1] + 1) / 2 * frame.height;
      let y = frame.height - (+vtext[2] + 1) / 2 * frame.height;
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