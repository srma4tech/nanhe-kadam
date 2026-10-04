import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function crc32(buffer) { let crc = -1; for (const byte of buffer) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ -1) >>> 0; }
function chunk(name, data) { const type = Buffer.from(name); const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const check = Buffer.alloc(4); check.writeUInt32BE(crc32(Buffer.concat([type, data]))); return Buffer.concat([length, type, data, check]); }
function insideEllipse(x, y, cx, cy, rx, ry, angle) { const cos = Math.cos(angle), sin = Math.sin(angle), dx = x - cx, dy = y - cy; const a = (dx * cos + dy * sin) / rx, b = (-dx * sin + dy * cos) / ry; return a * a + b * b <= 1; }
function segmentDistance(x, y, x1, y1, x2, y2) { const dx = x2-x1, dy = y2-y1, t = Math.max(0, Math.min(1, ((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy))); return Math.hypot(x-(x1+t*dx),y-(y1+t*dy)); }
function png(size, maskable) {
 const rgba = Buffer.alloc(size * size * 4); const cx=size/2, scale=size/512, safe=maskable?0.30:0;
 const pixel=(x,y,color)=>{const i=(y*size+x)*4;rgba[i]=color[0];rgba[i+1]=color[1];rgba[i+2]=color[2];rgba[i+3]=255;};
 for(let y=0;y<size;y++) for(let x=0;x<size;x++) pixel(x,y,[232,242,224]);
 for(let y=0;y<size;y++) for(let x=0;x<size;x++) { const nx=(x-cx)/(size*(0.46-safe)), ny=(y-cx)/(size*(0.46-safe)); if(nx*nx+ny*ny<1) pixel(x,y,[251,249,232]); }
 const mid=cx, base=size*0.70, top=size*0.32, stemWidth=9*scale;
 for(let y=Math.floor(top);y<Math.ceil(base);y++) for(let x=Math.floor(mid-stemWidth);x<Math.ceil(mid+stemWidth);x++) if(segmentDistance(x,y,mid,base,mid,top)<stemWidth/2) pixel(x,y,[72,126,84]);
 const leaves=[{x:mid-size*0.105,y:size*0.43,rx:size*0.13,ry:size*0.062,a:-0.58,c:[102,165,105]},{x:mid+size*0.105,y:size*0.37,rx:size*0.13,ry:size*0.062,a:0.58,c:[126,181,116]}];
 for(let y=0;y<size;y++) for(let x=0;x<size;x++) for(const l of leaves) if(insideEllipse(x,y,l.x,l.y,l.rx,l.ry,l.a)) pixel(x,y,l.c);
 const raw=Buffer.alloc((size*4+1)*size); for(let y=0;y<size;y++){const row=y*(size*4+1);raw[row]=0;rgba.copy(raw,row+1,y*size*4,(y+1)*size*4);}
 const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const outputs=[['assets/icon-192.png',192,false],['assets/icon-512.png',512,false],['assets/icon-maskable-512.png',512,true]];
for(const [file,size,mask] of outputs){const path=join(root,file);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,png(size,mask));console.log(`Generated ${file} (${size}x${size}${mask?', maskable':''})`);}

