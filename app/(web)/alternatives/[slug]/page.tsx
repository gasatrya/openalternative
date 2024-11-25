import type { Category } from "@prisma/client"
import { addMonths, getYear } from "date-fns"
import { AwardIcon } from "lucide-react"
import { ArrowUpRightIcon } from "lucide-react"
import { SmilePlusIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { SearchParams } from "nuqs/server"
import { Fragment, cache } from "react"
import { Prose } from "~/components/common/prose"
import { AlternativeCardExternal } from "~/components/web/alternatives/alternative-card-external"
import { AlternativePreviewList } from "~/components/web/alternatives/alternative-preview-list"
import { InlineMenu } from "~/components/web/inline-menu"
import { ShareButtons } from "~/components/web/share-buttons"
import { ToolEntry } from "~/components/web/tools/tool-entry"
import { BackButton } from "~/components/web/ui/back-button"
import { Button } from "~/components/web/ui/button"
import { FaviconImage } from "~/components/web/ui/favicon"
import { Intro, IntroDescription, IntroTitle } from "~/components/web/ui/intro"
import { Section } from "~/components/web/ui/section"
import type { AlternativeOne } from "~/server/alternatives/payloads"
import { findAlternative, findAlternativeSlugs } from "~/server/alternatives/queries"
import { findToolsWithCategories } from "~/server/tools/queries"
import { parseMetadata } from "~/utils/metadata"

export const revalidate = 86400 // 24 hours

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}

const getAlternative = cache(async ({ params }: PageProps) => {
  const { slug } = await params
  const alternative = await findAlternative({ where: { slug } })

  if (!alternative) {
    notFound()
  }

  return alternative
})

const getMetadata = (alternative: AlternativeOne) => {
  const year = getYear(addMonths(new Date(), 1))
  const count = alternative._count.tools

  return {
    title: `${count > 1 ? `${count} ` : ""}Best Open Source ${alternative.name} Alternatives in ${year}`,
    description: `A curated collection of the best open source alternatives to ${alternative.name}. Each listing includes a website screenshot along with a detailed review of its features.`,
  } satisfies Metadata
}

export const generateStaticParams = async () => {
  const alternatives = await findAlternativeSlugs({})
  return alternatives.map(({ slug }) => ({ slug }))
}

export const generateMetadata = async (props: PageProps) => {
  const alternative = await getAlternative(props)
  const url = `/alternatives/${alternative.slug}`

  return parseMetadata(
    Object.assign(getMetadata(alternative), {
      alternates: { canonical: url },
      openGraph: { url },
    }),
  )
}

export default async function AlternativePage(props: PageProps) {
  const [alternative, tools] = await Promise.all([
    getAlternative(props),

    findToolsWithCategories({
      where: { alternatives: { some: { alternative: { slug: (await props.params).slug } } } },
      orderBy: [{ isFeatured: "desc" }, { score: "desc" }],
    }),
  ])

  const medalColors = ["text-amber-500", "text-slate-400", "text-orange-700"]
  const { title } = getMetadata(alternative)

  // Sort the categories by count
  const categories = Object.values(
    tools.reduce<Record<string, { count: number; category: Category }>>((acc, { categories }) => {
      for (const { category } of categories) {
        if (!acc[category.name]) {
          acc[category.name] = { count: 0, category }
        }
        acc[category.name].count += 1
      }
      return acc
    }, {}),
  ).sort((a, b) => b.count - a.count)

  // Pick the top 5 tools
  const bestTools = tools.slice(0, 5).map(tool => (
    <Link key={tool.id} href={`/${tool.slug}`}>
      {tool.name}
    </Link>
  ))

  // Pick the top categories
  const bestCategories = categories.slice(0, 3).map(({ category }) => (
    <Link key={category.id} href={`/categories/${category.slug}`}>
      {category.label || category.name}
    </Link>
  ))

  return (
    <>
      <Intro>
        <IntroTitle>Open Source {alternative.name} Alternatives</IntroTitle>

        <IntroDescription className="max-w-4xl">
          {alternative._count.tools
            ? `A curated collection of the ${alternative._count.tools} best open source alternatives to ${alternative.name}.`
            : `No open source ${alternative.name} alternatives found yet.`}
        </IntroDescription>
      </Intro>

      {!!tools.length && (
        <Section>
          <Section.Content className="gap-12 md:gap-14 lg:gap-16">
            <Prose>
              <p>
                The best open source alternative to {alternative.name} is {bestTools.shift()}. If
                that doesn't suit you, we've compiled a{" "}
                <Link href="/about#how-are-rankings-calculated">ranked list</Link> of other open
                source {alternative.name} alternatives to help you find a suitable replacement.
                {!!bestTools.length && (
                  <>
                    {" "}
                    Other interesting open source
                    {bestTools.length === 1
                      ? ` alternative to ${alternative.name} is `
                      : ` alternatives to ${alternative.name} are: `}
                    {bestTools.map((alt, index) => (
                      <Fragment key={index}>
                        {index > 0 && index !== bestTools.length - 1 && ", "}
                        {index > 0 && index === bestTools.length - 1 && " and "}
                        {alt}
                      </Fragment>
                    ))}
                    .
                  </>
                )}
              </p>

              {!!bestCategories.length && (
                <p>
                  {alternative.name} alternatives are mainly {bestCategories.shift()}
                  {!!bestCategories.length && " but may also be "}
                  {bestCategories.map((category, index) => (
                    <Fragment key={index}>
                      {index > 0 && index !== bestCategories.length - 1 && ", "}
                      {index > 0 && index === bestCategories.length - 1 && " or "}
                      {category}
                    </Fragment>
                  ))}
                  . Browse these if you want a narrower list of alternatives or looking for a
                  specific functionality of {alternative.name}.
                </p>
              )}

              <ShareButtons title={title} className="not-prose" />
            </Prose>

            {tools.map(tool => (
              <ToolEntry key={tool.id} id={tool.slug} tool={tool} className="scroll-m-20" />
            ))}

            <BackButton href="/alternatives" />
          </Section.Content>

          <Section.Sidebar className="order-first md:order-last">
            <AlternativeCardExternal alternative={alternative} />

            <InlineMenu
              items={tools.map(({ slug, name, faviconUrl }, index) => ({
                id: slug,
                title: name,
                prefix: <FaviconImage src={faviconUrl} title={name} />,
                suffix: index < 3 && <AwardIcon className={medalColors[index]} />,
              }))}
              className="flex-1 mx-5 max-md:hidden"
            >
              <Button
                variant="ghost"
                prefix={<SmilePlusIcon />}
                suffix={<ArrowUpRightIcon />}
                className="font-normal text-muted ring-0!"
                asChild
              >
                <Link href="/submit">Suggest an alternative</Link>
              </Button>
            </InlineMenu>
          </Section.Sidebar>
        </Section>
      )}

      <AlternativePreviewList />
    </>
  )
}

//  export const loader = async ({ params: { alternative: slug } }: LoaderFunctionArgs) => {
//    try {
//      const [alternative, alternatives, tools] = await Promise.all([
//        prisma.alternative.findUniqueOrThrow({
//          where: { slug },
//          include: alternativeOnePayload,
//        }),

//        prisma.alternative.findMany({
//          where: {
//            slug: { in: FEATURED_ALTERNATIVES.filter(a => a !== slug) },
//            tools: { some: { tool: { publishedAt: { lte: new Date() } } } },
//          },
//          include: alternativeManyPayload,
//          take: 6,
//        }),

//        prisma.tool.findMany({
//          where: {
//            alternatives: { some: { alternative: { slug } } },
//            publishedAt: { lte: new Date() },
//          },
//          include: { categories: { include: { category: true } } },
//          orderBy: [{ isFeatured: "desc" }, { score: "desc" }],
//        }),
//      ])

//      // Sort the categories by count
//      const categories = Object.values(
//        tools.reduce<Record<string, { count: number; category: Category }>>((acc, { categories }) => {
//          for (const { category } of categories) {
//            if (!acc[category.name]) {
//              acc[category.name] = { count: 0, category }
//            }
//            acc[category.name].count += 1
//          }
//          return acc
//        }, {}),
//      ).sort((a, b) => b.count - a.count)

//      const meta = {
//        title: `${tools.length > 1 ? `${tools.length} ` : ""}Best Open Source ${alternative.name} Alternatives in ${year}`,
//        description: `A curated collection of the best open source alternatives to ${alternative.name}. Each listing includes a website screenshot along with a detailed review of its features.`,
//      }

//      return json(
//        { meta, alternative, alternatives, tools, categories },
//        { headers: { ...JSON_HEADERS } },
//      )
//    } catch (error) {
//      console.error(error)
//      throw json(null, { status: 404, statusText: "Not Found" })
//    }
//  }

//  export default function AlternativesPage() {
//    const { meta, alternative, alternatives, tools, categories } = useLoaderData<typeof loader>()
//    const medalColors = ["text-amber-500", "text-slate-400", "text-orange-700"]

//    // Pick the top 5 tools
//    const bestTools: ReactNode[] = tools.slice(0, 5).map(tool => (
//      <Link key={tool.id} href={`/${tool.slug}`}>
//        {tool.name}
//      </Link>
//    ))

//    // Pick the top 3 categories
//    const bestCategories = categories.slice(0, 3).map(({ category }) => (
//      <Link key={category.id} href={`/categories/${category.slug}`}>
//        {category.label || category.name}
//      </Link>
//    ))

//    return (
//      <>
//        <Intro>
//          <IntroTitle>Open Source {alternative.name} Alternatives</IntroTitle>

//          <IntroDescription className="max-w-4xl">
//            {tools.length
//              ? `A curated collection of the ${tools.length} best open source alternatives to ${alternative.name}.`
//              : `No open source ${alternative.name} alternatives found yet.`}
//          </IntroDescription>
//        </Intro>

//        {!!tools.length && (
//          <Section>
//            <Section.Content className="gap-12 md:gap-14 lg:gap-16">
//              <Prose>
//                <p>
//                  The best open source alternative to {alternative.name} is {bestTools.shift()}
//                  . If that doesn't suit you, we've compiled a{" "}
//                  <Link href="/about#how-are-rankings-calculated">
//                    ranked list
//                  </Link>{" "}
//                  of other open source {alternative.name} alternatives to help you find a suitable
//                  replacement.
//                  {!!bestTools.length && (
//                    <>
//                      {" "}
//                      Other interesting open source
//                      {bestTools.length === 1
//                        ? ` alternative to ${alternative.name} is `
//                        : ` alternatives to ${alternative.name} are: `}
//                      {bestTools.map((alt, index) => (
//                        <Fragment key={index}>
//                          {index > 0 && index !== bestTools.length - 1 && ", "}
//                          {index > 0 && index === bestTools.length - 1 && " and "}
//                          {alt}
//                        </Fragment>
//                      ))}
//                      .
//                    </>
//                  )}
//                </p>

//                {!!bestCategories.length && (
//                  <p>
//                    {alternative.name} alternatives are mainly {bestCategories.shift()}
//                    {!!bestCategories.length && " but may also be "}
//                    {bestCategories.map((category, index) => (
//                      <Fragment key={index}>
//                        {index > 0 && index !== bestCategories.length - 1 && ", "}
//                        {index > 0 && index === bestCategories.length - 1 && " or "}
//                        {category}
//                      </Fragment>
//                    ))}
//                    . Browse these if you want a narrower list of alternatives or looking for a
//                    specific functionality of {alternative.name}.
//                  </p>
//                )}

//                <ShareButtons title={meta.title} className="not-prose" />
//              </Prose>

//              {tools.map(tool => (
//                <ToolEntry key={tool.id} id={tool.slug} tool={tool} className="scroll-m-20" />
//              ))}

//              <BackButton href="/alternatives" />
//            </Section.Content>

//            <Section.Sidebar className="order-first md:order-last">
//              <AlternativeCard alternative={alternative} />

//              <InlineMenu
//                items={tools.map(({ slug, name, faviconUrl }, index) => ({
//                  id: slug,
//                  title: name,
//                  prefix: <FaviconImage src={faviconUrl} title={name} />,
//                  suffix: index < 3 && <AwardIcon className={medalColors[index]} />,
//                }))}
//                className="flex-1 mx-5 max-md:hidden"
//              >
//                <Button
//                  variant="ghost"
//                  prefix={<SmilePlusIcon />}
//                  suffix={<ArrowUpRightIcon />}
//                  className="font-normal text-muted ring-0!"
//                  asChild
//                >
//                  <Link href="/submit">
//                    Suggest an alternative
//                  </Link>
//                </Button>
//              </InlineMenu>
//            </Section.Sidebar>
//          </Section>
//        )}

//        <AlternativeList alternatives={alternatives} />
//      </>
//    )
//  }