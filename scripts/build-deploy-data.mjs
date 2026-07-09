import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const inputFile = process.argv[2];
const outputDir = process.argv[3] ? path.resolve(process.argv[3]) : process.cwd();

if (!inputFile) {
  console.error("用法：node scripts/build-deploy-data.mjs <oc-library-备份.json> [输出目录]");
  process.exit(1);
}

const imageCache = new Map();
const imageDir = path.join(outputDir, "images");

function extensionFromMime(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/svg+xml") return "svg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "png";
}

function safeName(value, fallback = "image") {
  return String(value || fallback)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || fallback;
}

function parseDataImage(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mime: match[1],
    base64: match[2],
  };
}

async function saveDataImage(dataUrl, hint) {
  if (imageCache.has(dataUrl)) return imageCache.get(dataUrl);

  const parsed = parseDataImage(dataUrl);
  if (!parsed) return dataUrl;

  const bytes = Buffer.from(parsed.base64, "base64");
  const hash = createHash("sha1").update(bytes).digest("hex").slice(0, 12);
  const filename = `${safeName(hint)}-${hash}.${extensionFromMime(parsed.mime)}`;
  const relativePath = `images/${filename}`;
  const outputPath = path.join(imageDir, filename);

  await mkdir(imageDir, { recursive: true });
  await writeFile(outputPath, bytes);
  imageCache.set(dataUrl, relativePath);
  return relativePath;
}

function objectHint(object, fallback) {
  return object?.name || object?.title || object?.caption || object?.id || fallback;
}

async function convertValue(value, hint = "image") {
  const parsed = parseDataImage(value);
  if (parsed) return saveDataImage(value, hint);

  if (Array.isArray(value)) {
    return Promise.all(value.map((item, index) => convertValue(item, `${hint}-${index + 1}`)));
  }

  if (!value || typeof value !== "object") return value;

  const converted = {};
  const localHint = objectHint(value, hint);

  for (const [key, item] of Object.entries(value)) {
    if (key === "dataUrl" && parseDataImage(item)) {
      converted.src = await saveDataImage(item, localHint);
      continue;
    }
    converted[key] = await convertValue(item, `${localHint}-${key}`);
  }

  return converted;
}

const source = JSON.parse(await readFile(path.resolve(inputFile), "utf8"));
const characters = Array.isArray(source) ? source : source.characters;

if (!Array.isArray(characters)) {
  console.error("输入文件不是 OC 资料库备份 JSON：缺少 characters 数组。");
  process.exit(1);
}

const output = {
  app: "OC资料库分享页",
  version: 1,
  exportedAt: new Date().toISOString(),
  characters: await convertValue(characters, "oc"),
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "data.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(`已生成 ${path.join(outputDir, "data.json")}`);
console.log(`已导出 ${imageCache.size} 张图片到 ${imageDir}`);
