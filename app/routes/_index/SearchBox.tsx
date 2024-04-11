import { LoaderIcon, SearchIcon, XIcon } from "lucide-react"
import { HTMLAttributes, useEffect, useState } from "react"
import { useDebounce } from "@uidotdev/usehooks"
import { useInstantSearch, useSearchBox, type UseSearchBoxProps } from "react-instantsearch"
import { Input } from "~/components/forms/Input"
import { cx } from "~/utils/cva"

type SearchBoxProps = HTMLAttributes<HTMLElement> & UseSearchBoxProps

export const SearchBox = ({ className, ...props }: SearchBoxProps) => {
  const { query, refine } = useSearchBox(props)
  const { status } = useInstantSearch()
  const [searchQuery, setSearchQuery] = useState(query)
  const debouncedSearchTerm = useDebounce(searchQuery, 250)
  const isSearchStalled = status === "stalled"

  useEffect(() => {
    refine(debouncedSearchTerm)
  }, [debouncedSearchTerm, refine])

  return (
    <form
      role="search"
      noValidate
      className={cx("relative", className)}
      onReset={() => setSearchQuery("")}
    >
      <Input
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        placeholder="Search tools"
        className="!pr-12 w-full"
        spellCheck={false}
        maxLength={512}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.currentTarget.value)}
      />

      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {!!searchQuery.length && !isSearchStalled && (
          <button type="reset" className="opacity-60 hover:opacity-100">
            <XIcon className="size-4" />
          </button>
        )}

        {isSearchStalled && <LoaderIcon className="size-4 animate-spin" />}

        <button className="opacity-60 hover:opacity-100">
          <SearchIcon className="size-4" />
        </button>
      </div>
    </form>
  )
}