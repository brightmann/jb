export default {
  originalWidth: 2048,
  originalHeight: 1024,
  width: 16,
  height: 8,
  type: 'webp',
  // Base-path aware: /images/space.png on root hosting (Workers),
  // /jb/images/space.png on GitHub Pages. A hardcoded '/images/...'
  // 404s under /jb, leaving every post header imageless.
  src: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/images/space.png`,
}
