// Recorte e otimização de GIF e vídeo no envio.
// A imagem parada é recortada no navegador (canvas). GIF e vídeo não podem
// passar por canvas sem perder a animação, então o navegador manda só a área
// escolhida (fração 0..1 do quadro) e o ffmpeg faz o corte aqui.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const MAX_SECONDS = 30;
const FFMPEG = (() => {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try { return require('ffmpeg-static') || 'ffmpeg'; } catch { return 'ffmpeg'; }
})();

function parseCrop(raw) {
  if (!raw) return null;
  try {
    const c = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const [x, y, w, h] = [c.x, c.y, c.w, c.h].map(Number);
    if (![x, y, w, h].every(Number.isFinite)) return null;
    const cx = Math.min(Math.max(x, 0), 0.99);
    const cy = Math.min(Math.max(y, 0), 0.99);
    const cw = Math.min(Math.max(w, 0.02), 1 - cx);
    const ch = Math.min(Math.max(h, 0.02), 1 - cy);
    return { x: cx, y: cy, w: cw, h: ch };
  } catch { return null; }
}

function run(args) {
  return new Promise((resolve, reject) => {
    execFile(FFMPEG, args, { timeout: 180000, maxBuffer: 8 * 1024 * 1024 }, (error, _out, stderr) => {
      if (error) { error.stderr = stderr; reject(error); } else resolve();
    });
  });
}

// Recorta/otimiza req.file quando ele é GIF ou vídeo. Devolve true se mexeu no
// arquivo. Se o ffmpeg não existir no servidor, mantém o original (sem recorte)
// e marca req.mediaNotCropped para o navegador poder avisar.
async function processAnimated(req) {
  const file = req.file;
  if (!file) return false;
  const isGif = file.mimetype === 'image/gif';
  const isVideo = /^video\//.test(file.mimetype);
  if (!isGif && !isVideo) return false;

  const crop = parseCrop(req.body && req.body.crop);
  const dir = path.dirname(file.path);
  const base = path.basename(file.filename, path.extname(file.filename));
  const outName = `${base}-c${isGif ? '.gif' : '.mp4'}`;
  const outPath = path.join(dir, outName);

  // Larguras pares (exigência do H.264) e teto de resolução.
  const cropFilter = crop
    ? `crop=trunc(iw*${crop.w.toFixed(5)}/2)*2:trunc(ih*${crop.h.toFixed(5)}/2)*2:trunc(iw*${crop.x.toFixed(5)}/2)*2:trunc(ih*${crop.y.toFixed(5)}/2)*2,`
    : '';
  let args;
  if (isGif) {
    const vf = `${cropFilter}fps=15,scale='min(720,iw)':-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=192[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`;
    args = ['-y', '-v', 'error', '-t', String(MAX_SECONDS), '-i', file.path, '-vf', vf, '-loop', '0', outPath];
  } else {
    const vf = `${cropFilter}scale='min(1280,iw)':-2:flags=lanczos,format=yuv420p`;
    args = ['-y', '-v', 'error', '-t', String(MAX_SECONDS), '-i', file.path,
      '-vf', vf, '-map', '0:v:0', '-map', '0:a:0?',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', outPath];
  }

  try {
    await run(args);
  } catch (error) {
    fs.promises.unlink(outPath).catch(() => {});
    if (error.code === 'ENOENT') { req.mediaNotCropped = true; return false; }
    fs.promises.unlink(file.path).catch(() => {});
    const err = new Error('Não foi possível processar essa mídia. Tente outro arquivo (MP4, WebM, MOV ou GIF).');
    err.status = 422;
    throw err;
  }
  fs.promises.unlink(file.path).catch(() => {});
  req.file = { ...file, filename: outName, path: outPath, mimetype: isGif ? 'image/gif' : 'video/mp4' };
  return true;
}

// Middleware: roda depois do multer.
const processMedia = (req, _res, next) => {
  processAnimated(req).then(() => next(), next);
};

// Diz se o ffmpeg existe neste servidor (usado em /api/health).
let ffmpegChecked = null;
function hasFfmpeg() {
  if (ffmpegChecked) return ffmpegChecked;
  ffmpegChecked = new Promise((resolve) => execFile(FFMPEG, ['-version'], { timeout: 8000 }, (error) => resolve(!error)));
  return ffmpegChecked;
}

module.exports = { processMedia, processAnimated, hasFfmpeg };
