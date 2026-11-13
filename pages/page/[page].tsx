import BlogPostCard from '@/layouts/components/BlogPostCard'
import Pagination from '@/components/Pagination'
import { Layout } from '@/layouts'
import { PageProps } from '@/lib/types'
import cover from '@/public/images/city.webp'
import {
  getPagePosts,
  getPostList,
  getTotalPages,
} from '@/lib/get-post-list'

export const getStaticPaths = async () => {
  const { postList } = await getPostList()
  const totalPages = getTotalPages(postList)

  // Page 1 is the homepage (/). Only generate /page/2 .. /page/N.
  const paths = []
  for (let page = 2; page <= totalPages; page++) {
    paths.push({ params: { page: String(page) } })
  }

  return { paths, fallback: false }
}

export const getStaticProps = async ({ params }) => {
  try {
    const page = parseInt(params.page as string, 10)
    const { props, postList } = await getPostList()
    if ((props as any).error) {
      throw (props as any).error
    }

    const totalPages = getTotalPages(postList)
    if (!Number.isFinite(page) || page < 2 || page > totalPages) {
      return { notFound: true }
    }

    const pagePosts = getPagePosts(postList, page)

    return {
      props: {
        ...props,
        postList: pagePosts,
        currentPage: page,
        totalPages,
      },
    }
  } catch (err) {
    console.error('page error', err)
    throw err
  }
}

export default function PaginatedPage(props: any) {
  return (
    <Layout
      {...props}
      title={`${props.site.name} — Page ${props.currentPage}`}
      description={props.site.description}
      coverImage={{
        src: cover,
      }}
    >
      <div className='w-full'>
        <div className='space-y-4 lg:space-y-8 container'>
          {props.postList.map((post) => (
            <BlogPostCard key={post.id} {...post} />
          ))}
        </div>
        <Pagination
          currentPage={props.currentPage}
          totalPages={props.totalPages}
        />
      </div>
    </Layout>
  )
}
