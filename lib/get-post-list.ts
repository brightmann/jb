import defaultCoverImage from '@/data/defaultCoverImage'
import { getCanonicalPageId } from '@/lib/get-canonical-page-id'
import getIcon from '@/lib/get-icon'
import { domain } from '@/lib/config'
import { mapImageUrl } from 'lib/map-image-url'
import { resolveNotionPage } from 'lib/resolve-notion-page'
import config from '@/site.config'
import {
  getBlockIcon,
  getBlockTitle,
  getPageProperty,
  normalizeUrl,
  parsePageId,
} from 'notion-utils'

export const POSTS_PER_PAGE = 4

// Fetch the Notion page + Blog Posts database and return every public post,
// sorted newest-first by Published date (falling back to created time).
// Shared by the homepage (page 1) and /page/[page].
export async function getPostList() {
  const props = (await resolveNotionPage(domain)) as any
  if (props.error) {
    throw props.error
  }

  const collectionId = parsePageId(config.postsCollectionId)
  const recordMap = props.recordMap
  const getUrl = (pageId) =>
    getCanonicalPageId(parsePageId(pageId, { uuid: true }), recordMap, {
      uuid: process.env.NODE_ENV && process.env.NODE_ENV === 'development',
    })

  const schema = recordMap.collection?.[collectionId]?.value?.schema ?? {}
  const tagSchemaOptions =
    (
      Object.values(schema).find((x: any) => x.name === 'Tags') as any
    )?.options ?? []
  const tagColorMap = Object.fromEntries(
    tagSchemaOptions.map((x: any) => [x.value, x.color])
  )

  const postList = Object.entries(props.recordMap.block)
    .map(([id, { value: block }]: [string, any]) => {
      if (parsePageId(block.parent_id) !== collectionId) return false
      const isPublic = getPageProperty<boolean>('Public', block, recordMap)
      if (!isPublic) return false

      const title = getBlockTitle(block, props.recordMap)
      const icon = getIcon(getBlockIcon(block, props.recordMap), block)

      const description = getPageProperty<string>(
        'Description',
        block,
        recordMap
      )
      const tags = getPageProperty<string[]>('Tags', block, recordMap)?.filter?.(
        (t) => t && t.length > 0
      )
      const date =
        getPageProperty<number>('Published', block, recordMap) ??
        block.created_time
      const coverImageSrc = mapImageUrl(block?.format?.page_cover, block)

      const coverImage = coverImageSrc
        ? {
            src: coverImageSrc,
            ...(recordMap?.preview_images?.[coverImageSrc] ??
              recordMap?.preview_images?.[normalizeUrl(coverImageSrc)]),
          }
        : defaultCoverImage

      return {
        id,
        collectionId,
        title,
        icon,
        coverImage,
        tags: (tags ?? []).map((t) => ({
          name: t,
          color: tagColorMap[t],
        })),
        date,
        block,
        description,
        // Absolute path: getCanonicalPageId returns a bare slug (e.g.
        // "test-post"), which resolves relative to the current page.
        // On /page/2 that wrongly became /page/test-post, so prefix "/".
        url: `/${String(getUrl(id)).replace(/^\//, '')}`,
      }
    })
    .filter(Boolean)
    // Newest first by Published date. Published is date-only (midnight),
    // so posts on the same day tie — break the tie by the Notion page's
    // creation time so the most recently created comes first.
    .sort((a: any, b: any) => {
      const ta = new Date(a.date).getTime()
      const tb = new Date(b.date).getTime()
      if (tb !== ta) return tb - ta
      const ca = new Date(a.block?.created_time).getTime() || 0
      const cb = new Date(b.block?.created_time).getTime() || 0
      return cb - ca
    })

  return { props, postList }
}

export function getTotalPages(postList: any[]) {
  return Math.max(1, Math.ceil(postList.length / POSTS_PER_PAGE))
}

export function getPagePosts(postList: any[], page: number) {
  const start = (page - 1) * POSTS_PER_PAGE
  return postList.slice(start, start + POSTS_PER_PAGE)
}
