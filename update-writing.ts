// 用 noahqin.dev 的 RSS 更新 GitHub 主页 README 的 Writing 区块(Deno + TypeScript)

const FEED_URL = "https://noahqin.dev/rss.xml";
const POST_COUNT = 3;
const START_MARKER = "<!-- WRITING:START -->";
const END_MARKER = "<!-- WRITING:END -->";

interface Post {
  title: string;
  link: string;
  date: Date;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function readTag(item: string, tag: string): string {
  const match = item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  if (!match) throw new Error(`RSS item 缺少 <${tag}>`);
  return decodeEntities(match[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim());
}

async function fetchPosts(): Promise<Post[]> {
  const res = await fetch(FEED_URL);
  if (!res.ok) throw new Error(`RSS 请求失败: ${res.status} ${res.statusText}`);
  const xml = await res.text();

  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items
    .map((item) => ({
      title: readTag(item, "title"),
      link: readTag(item, "link"),
      date: new Date(readTag(item, "pubDate")),
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, POST_COUNT);
}

function formatPosts(posts: Post[]): string {
  return posts
    .map((post) => {
      const date = post.date.toISOString().slice(0, 10);
      const title = post.title.replace(/[[\]]/g, "\\$&");
      return `- [${title}](${post.link}) · ${date}`;
    })
    .join("\n");
}

async function updateReadme(): Promise<void> {
  console.log("Fetching posts...");
  const posts = await fetchPosts();
  if (posts.length === 0) throw new Error("RSS 中没有文章");
  console.log(`Found ${posts.length} posts`);

  const readmePath = "./README.md";
  const readme = await Deno.readTextFile(readmePath);
  const startIndex = readme.indexOf(START_MARKER);
  const endIndex = readme.indexOf(END_MARKER, startIndex);
  if (startIndex === -1 || endIndex === -1) {
    throw new Error("Could not find Writing section markers");
  }

  const newReadme = readme.substring(0, startIndex + START_MARKER.length) +
    "\n" + formatPosts(posts) + "\n" +
    readme.substring(endIndex);

  await Deno.writeTextFile(readmePath, newReadme);
  console.log("README.md updated successfully!");
}

try {
  await updateReadme();
} catch (error) {
  console.error("Error updating README:", error);
  Deno.exit(1);
}
