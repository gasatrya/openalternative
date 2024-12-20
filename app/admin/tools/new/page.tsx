import { ToolForm } from "~/app/admin/tools/_components/tool-form"
import { getAlternatives, getCategories } from "~/app/admin/tools/_lib/queries"
import { Wrapper } from "~/components/admin/ui/wrapper"
import { H3 } from "~/components/common/heading"

export default async function CreateToolPage() {
  const [alternatives, categories] = await Promise.all([getAlternatives(), getCategories()])

  return (
    <Wrapper size="md">
      <H3>Create tool</H3>

      <ToolForm alternatives={alternatives} categories={categories} />
    </Wrapper>
  )
}
