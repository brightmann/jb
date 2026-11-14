import { NotionAPI } from 'notion-client'
import { ExtendedRecordMap, SearchParams, SearchResults } from 'notion-types'
import { mergeRecordMaps } from 'notion-utils'
import pMap from 'p-map'
import { isPreviewImageSupportEnabled, navigationLinks } from './config'
import db from './db'
import { getPreviewImageMap } from './preview-images'

class Notion extends NotionAPI {
  navigationLinkRecordMaps: ExtendedRecordMap[] = []
  navigationLinkRecordMapsFetched = false

  // Notion's edge 403s requests without a browser User-Agent (got's default
  // UA is blocked). Every API call goes through fetch, so inject one here.
  // The same hook also unwraps the API's double-wrapped records
  // ({ value: { value: block, role } }): notion-utils/react-notion-x expect
  // single-wrapped records, so without this the collection schema lookup
  // misses, collection views are never discovered, and posts never enter
  // the site map.
  // Notion rate-limits bursts (429) — the build fetches many pages in
  // parallel, so a plain fetch fails the whole build on a busy day.
  // Retry 429s with exponential backoff so the build self-heals instead
  // of dying on three posts (seen on a local Windows build 2026-11-13).
  // Jitter matters: several fetches hit 429 at once, and without it they
  // retry in lockstep and keep colliding (thundering herd) — the 5-attempt
  // version still failed on a Windows build for exactly this reason.
  async fetch<T>(params: any): Promise<T> {
    const maxAttempts = 8
    let delayMs = 2000
    for (let attempt = 1; ; attempt++) {
      try {
        const result: any = await super.fetch({
          ...params,
          headers: {
            'user-agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...params.headers,
          },
        })
        if (result && typeof result === 'object' && result.recordMap) {
          normalizeRecordMap(result.recordMap)
        }
        return result
      } catch (err: any) {
        const status =
          err?.response?.statusCode ?? err?.statusCode ?? err?.status
        const is429 =
          status === 429 || String(err?.message ?? '').includes('429')
        if (!is429 || attempt >= maxAttempts) throw err
        // Spread concurrent retries: base delay doubles (2s, 4s, 8s, ...)
        // plus up to 1s of random jitter so simultaneous 429s don't retry
        // in lockstep and hit the limit together again.
        const waitMs = delayMs + Math.floor(Math.random() * 1000)
        console.warn(
          `Notion 429 — retrying fetch in ${waitMs}ms (attempt ${attempt}/${maxAttempts})`
        )
        await new Promise((resolve) => setTimeout(resolve, waitMs))
        delayMs *= 2
      }
    }
  }

  async getNavigationLinkPages() {
    const navigationLinkPageIds = navigationLinks
      .map((link) => link.pageId)
      .filter(Boolean)

    if (navigationLinkPageIds.length) {
      this.navigationLinkRecordMaps = await pMap(
        navigationLinkPageIds,
        async (navigationLinkPageId) =>
          super.getPage(navigationLinkPageId, {
            chunkLimit: 1,
            fetchMissingBlocks: false,
            fetchCollections: false,
            signFileUrls: false,
          }),
        {
          concurrency: 4,
        }
      )
    }
  }

  async getPage(pageId: string, options?: any) {
    console.time(`📄 getPage ${pageId}`)

    const cacheKey = `notion-page-id:${pageId}`
    const cachedPage = await db.get(cacheKey)
    if (cachedPage) {
      console.timeEnd(`📄 getPage ${pageId}`)
      return cachedPage
    }

    if (!this.navigationLinkRecordMapsFetched) {
      await this.getNavigationLinkPages()
      this.navigationLinkRecordMapsFetched = true
    }

    let recordMap = await super.getPage(pageId, options)

    // const navigationLinkRecordMaps = await this.getNavigationLinkPages()

    if (this.navigationLinkRecordMaps?.length) {
      recordMap = this.navigationLinkRecordMaps.reduce(
        (map, navigationLinkRecordMap) =>
          mergeRecordMaps(map, navigationLinkRecordMap),
        recordMap
      )
    }
    if (isPreviewImageSupportEnabled) {
      const previewImageMap = await getPreviewImageMap(recordMap)
      ;(recordMap as any).preview_images = previewImageMap
    }
    await db.set(cacheKey, recordMap)

    console.timeEnd(`📄 getPage ${pageId}`)
    return recordMap
  }
  async search(params: SearchParams): Promise<SearchResults> {
    return super.search(params)
  }
}

function normalizeRecordMap(recordMap: any) {
  if (!recordMap || typeof recordMap !== 'object') return
  for (const table of Object.values(recordMap)) {
    if (!table || typeof table !== 'object') continue
    for (const entry of Object.values(table as object)) {
      if (!entry || typeof entry !== 'object') continue
      const e = entry as any
      // Unwrap { value: { value: record, role } } -> { value: record }.
      // Real records never have a top-level `value` object field, so this
      // only fires on the API's wrapper.
      while (
        e.value &&
        typeof e.value === 'object' &&
        e.value.value &&
        typeof e.value.value === 'object'
      ) {
        e.value = e.value.value
      }
    }
  }
}

const notion = new Notion({
  apiBaseUrl: process.env.NOTION_API_BASE_URL,
})

export default notion
