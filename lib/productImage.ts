export function productImageUrl(url: string, width = 720, height = 720) {
  if (url.startsWith("data:")) return url;
  const secure = url.replace(/^http:\/\//i, "https://");
  return `/.netlify/images?url=${encodeURIComponent(secure)}&w=${width}&h=${height}&fit=cover&q=84`;
}
