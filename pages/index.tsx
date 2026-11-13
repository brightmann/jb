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

export const getStaticProps = async () => {
  try {
    const { props, postList } = await getPostList()
    if ((props as any).error) {
      throw (props as any).error
    }

    const totalPages = getTotalPages(postList)
    const pagePosts = getPagePosts(postList, 1)

    return {
      props: {
        ...props,
        postList: pagePosts,
        currentPage: 1,
        totalPages,
      },
    }
  } catch (err) {
    console.error('page error', err)

    // we don't want to publish the error version of this page, so
    // let next.js know explicitly that incremental SSG failed
    throw err
  }
}

export default function NotionDomainPage(props: any) {
  return (
    <Layout
      {...props}
      title={props.site.name}
      description={props.site.description}
      coverImage={{
        src: cover,
      }}
    >
      <div className='space-y-4 lg:space-y-8 container'>
        {props.postList.map((post) => (
          <BlogPostCard key={post.id} {...post} />
        ))}
      </div>
      <Pagination
        currentPage={props.currentPage}
        totalPages={props.totalPages}
      />
    </Layout>
  )
}
