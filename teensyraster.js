const BLACK = rgb(0, 0, 0);
const WHITE = rgb(255, 255, 255);
const YELLOW = rgb(255, 255, 100);
const RED = rgb(255, 0, 0);
const GREEN = rgb(0, 255, 0);
const BLUE = rgb(0, 0, 255);
const PURPLE = rgb(255, 0, 255);

let MODEL;

let frame = document.getElementById('frame');
let context = frame.getContext('2d');
const surface = context.createImageData(frame.width, frame.height);
const framebuffer = makeBuffer(frame.width*frame.height, BLACK);
const zbuffer = makeBuffer(frame.width*frame.height, -1);

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
  let [lx, ly, lz] = normalize(0, 0, -1);
  let start = new Date().getTime();
  clear(framebuffer, BLACK);
  clear(zbuffer, -Infinity);
  for(let i = 0; i < MODEL.faces.length; i++) {
    let face = MODEL.faces[i];
    let w0 = MODEL.vertices[face.v0i];
    let w1 = MODEL.vertices[face.v1i];
    let w2 = MODEL.vertices[face.v2i];
    let [sx0,sy0] = projection(w0);
    let [sx1,sy1] = projection(w1);
    let [sx2,sy2] = projection(w2);
    let [nx,ny,nz] = unitNormal(
      w2.x-w0.x, w2.y-w0.y, w2.z-w0.z, 
      w1.x-w0.x, w1.y-w0.y, w1.z-w0.z);
    let intensity = lx*nx+ly*ny+lz*nz;
    // if(intensity <= 0) continue;
    let color;
    if(intensity <= 0) {
      color = PURPLE;
    }else{
      color = rgb(255 * intensity, 255 * intensity, 255 * intensity);
    }
    scanlineTriangle(sx0, sy0, w0.z, sx1, sy1, w1.z, sx2, sy2, w2.z, color, zbuffer, framebuffer, frame.width);
  }
  // scanlineTriangle(10, 10, 10, 102, 2000, 500, RED, framebuffer, frame.width);
  let endDraw = new Date().getTime();
  // scaleZBuffer(zbuffer, 5, 200); blit(zbuffer);
  blit(framebuffer);
  let end = new Date().getTime();
  console.log({
    total: end-start,
    draw: endDraw-start,
    blit: end-endDraw
  });
}

function barycenter(ax, ay, bx, by, cx, cy, px, py) {
  let [i,j,k] = cross(
    bx-ax, cx-ax, ax-px,
    by-ay, cy-ay, ay-py);
  return [
    1 - (i+j)/k,
    i/k,
    j/k
  ]
}

function unitNormal(x0, y0, z0, x1, y1, z1) {
  return normalize(...cross(x0, y0, z0, x1, y1, z1));
}

function normalize(x, y, z) {
  let len = length(x, y, z);
  return [
    x/len, y/len, z/len
  ];
}

function length(x, y, z) {
  return Math.sqrt(x*x+y*y+z*z);
}

function cross(x0, y0, z0, x1, y1, z1) {
  let x = y0*z1-z0*y1;
  let y = z0*x1-x0*z1;
  let z = x0*y1-y0*x1;
  return [
    x, y, z
  ];
}

function dot(x0, y0, z0, x1, y1, z1) {
  return x0*x1 + y0*y1 + z0*z1;
}

function projection(vertex) {
  return [
    ((vertex.x + 1) / 2 * frame.height),
    frame.height - ((vertex.y + 1) / 2 * frame.height)
  ];
}

function scanlineTriangle(x0, y0, z0, x1, y1, z1, x2, y2, z2, color, zbuffer, buffer, width) {
  // ignore degenerate triangles (three points are colinear)
  if(y0 == y1 && y1 == y2) {
    return;
  }
  // sort vertices vertically
  if(y0 > y1) {
    let swapY = y0; y0 = y1; y1 = swapY;
    let swapX = x0; x0 = x1; x1 = swapX;
    let swapZ = z0; z0 = z1; z1 = swapZ;
  }
  if(y0 > y2) {
    let swapY = y0; y0 = y2; y2 = swapY;
    let swapX = x0; x0 = x2; x2 = swapX;
    let swapZ = z0; z0 = z2; z2 = swapZ;
  }
  if(y1 > y2) {
    let swapY = y1; y1 = y2; y2 = swapY;
    let swapX = x1; x1 = x2; x2 = swapX;
    let swapZ = z1; z1 = z2; z2 = swapZ;
  }
  let dy02 = y2-y0;
  let dy01 = y1-y0;
  let dy12 = y2-y1;
  // draw bottom of triangle, if non-degenerate
  if(dy01 != 0) {
    for(let y = Math.ceil(y0); y <= Math.floor(y1); y++) {
      let x02 = x0 + (x2-x0) * (y-y0) / dy02;
      let x01 = x0 + (x1-x0) * (y-y0) / dy01;
      if(Math.abs(x02-x01) > 300) {
        console.log({
          y, y0
        });
      }
      if(x02 > x01) {
        let swap = x02; x02 = x01; x01 = swap;
      }
      if(x02 >= width) {
        break;
      }
      if(x01 > width) {
        x01 = width;
      }
      for(let x = Math.ceil(x02); x <= Math.floor(x01); x++) {
        let i = x+y*width;
        let [w, u, v] = barycenter(x0, y0, x1, y1, x2, y2, x, y);
        let z = w*z0+u*z1+v*z2;
        if(z > zbuffer[i]) {
          zbuffer[i] = z;
          buffer[i] = color;
        }
      }
    }
  }
  // draw top of triangle, if non-degenerate
  if(dy12 != 0) {
    for(let y = Math.ceil(y1); y <= Math.floor(y2); y++) {
      let x02 = x0 + (x2-x0) * (y-y0) / dy02;
      let x12 = x1 + (x2-x1) * (y-y1) / dy12;
      if(x02 > x12) {
        let swap = x02; x02 = x12; x12 = swap;
      }
      if(x02 >= width) {
        break;
      }
      if(x12 > width) {
        x12 = width;
      }
      for(let x = Math.ceil(x02); x <= Math.floor(x12); x++) {
        let i = x+y*width;
        let [w, u, v] = barycenter(x0, y0, x1, y1, x2, y2, x, y);
        let z = w*z0+u*z1+v*z2;
        if(z > zbuffer[i]) {
          zbuffer[i] = z;
          buffer[i] = color;
        }
      }
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
    let color =  buffer[i];
    surface.data[p+0] = (color >> 16) & 0xFF;
    surface.data[p+1] = (color >> 8) & 0xFF;
    surface.data[p+2] = (color >> 0) & 0xFF;
    surface.data[p+3] = 255;
  }
  context.putImageData(surface, 0, 0);
}

function scaleZBuffer(buffer, min, max) {
  let minValue = Infinity;
  let maxValue = -Infinity;
  for(let i = 0; i < buffer.length; i++) {
    if(buffer[i] < minValue && buffer[i] != -Infinity) {
      minValue = buffer[i];
    }
    if(buffer[i] > maxValue) {
      maxValue = buffer[i];
    }
  }
  for(let i = 0; i < buffer.length; i++) {
    if(buffer[i] == -Infinity) {
      buffer[i] = PURPLE;
    }else{
      let intensity = Math.floor((buffer[i]-minValue) / (maxValue-minValue) * (max-min)+min);
      buffer[i] = rgb(intensity, intensity, intensity);
    }
  }
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