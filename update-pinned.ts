// 更新 GitHub 主页 README 的 Featured Projects(Deno + TypeScript)

const USERNAME = "noah-qin";

interface Repo {
  name: string;
  description: string | null;
  url: string;
  primaryLanguage: { name: string } | null;
}

interface GraphQLResponse {
  data: { user: { pinnedItems: { nodes: Repo[] } } };
  errors?: unknown;
}

const query = `
{
  user(login: "${USERNAME}") {
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository {
          name
          description
          url
          primaryLanguage {
            name
          }
        }
      }
    }
  }
}
`;

async function fetchPinnedRepos(): Promise<Repo[]> {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) throw new Error("GITHUB_TOKEN 环境变量未设置");

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "User-Agent": "deno-update-pinned",
    },
    body: JSON.stringify({ query }),
  });

  const result: GraphQLResponse = await res.json();
  if (result.errors) throw new Error(JSON.stringify(result.errors));
  return result.data.user.pinnedItems.nodes;
}

function formatRepo(repo: Repo): string {
  let result = `**[${repo.name}](${repo.url})**\n<br>\n`;
  if (repo.description) result += `${repo.description}\n<br>\n`;
  result += `\`${repo.primaryLanguage?.name ?? "Unknown"}\`\n\n`;
  return result;
}

function generateProjectsTable(repos: Repo[]): string {
  const rows: string[] = [];
  for (let i = 0; i < repos.length; i += 2) {
    const left = repos[i];
    const right = repos[i + 1];
    let row = '<tr>\n<td width="50%">\n\n';
    row += formatRepo(left);
    row += '</td>\n<td width="50%">\n\n';
    if (right) {
      row += formatRepo(right);
    } else {
      row +=
        `**[More Projects →](https://github.com/${USERNAME}?tab=repositories)**\n\n`;
    }
    row += "</td>\n</tr>";
    rows.push(row);
  }
  if (repos.length % 2 === 0) {
    rows.push(
      '<tr>\n<td width="50%">\n\n**[More Projects →](https://github.com/' +
        USERNAME +
        '?tab=repositories)**\n\n</td>\n<td width="50%">\n\n</td>\n</tr>',
    );
  }
  return "<table>\n" + rows.join("\n") + "\n</table>";
}

async function updateReadme(): Promise<void> {
  console.log("Fetching pinned repositories...");
  const repos = await fetchPinnedRepos();
  console.log(`Found ${repos.length} pinned repositories`);

  const readmePath = "./README.md";
  const readme = await Deno.readTextFile(readmePath);
  const projectsTable = generateProjectsTable(repos);

  const startMarker = "### Featured Projects\n\n";
  const endMarker = "\n\n---\n\n### Tech Stack";
  const startIndex = readme.indexOf(startMarker);
  const endIndex = readme.indexOf(endMarker, startIndex);
  if (startIndex === -1 || endIndex === -1) {
    throw new Error("Could not find Featured Projects section markers");
  }

  const newReadme = readme.substring(0, startIndex + startMarker.length) +
    projectsTable +
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
