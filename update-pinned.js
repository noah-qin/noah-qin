const https = require('https');
const fs = require('fs');

const USERNAME = 'imnotnoahhh';

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

function fetchPinnedRepos() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const options = {
      hostname: 'api.github.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'Node.js'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.errors) {
            reject(new Error(JSON.stringify(result.errors)));
          } else {
            resolve(result.data.user.pinnedItems.nodes);
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function formatRepo(repo) {
  let result = `**[${repo.name}](${repo.url})**\n<br>\n`;

  if (repo.description) {
    result += `${repo.description}\n<br>\n`;
  }

  result += `\`${repo.primaryLanguage?.name || 'Unknown'}\`\n\n`;
  return result;
}

function generateProjectsTable(repos) {
  const rows = [];

  for (let i = 0; i < repos.length; i += 2) {
    const left = repos[i];
    const right = repos[i + 1];

    let row = '<tr>\n<td width="50%">\n\n';

    row += formatRepo(left);
    row += '</td>\n<td width="50%">\n\n';

    if (right) {
      row += formatRepo(right);
    } else {
      row += `**[More Projects →](https://github.com/${USERNAME}?tab=repositories)**\n\n`;
    }

    row += '</td>\n</tr>';
    rows.push(row);
  }

  if (repos.length % 2 === 0) {
    rows.push('<tr>\n<td width="50%">\n\n**[More Projects →](https://github.com/' + USERNAME + '?tab=repositories)**\n\n</td>\n<td width="50%">\n\n</td>\n</tr>');
  }

  return '<table>\n' + rows.join('\n') + '\n</table>';
}

async function updateReadme() {
  try {
    console.log('Fetching pinned repositories...');
    const repos = await fetchPinnedRepos();
    console.log(`Found ${repos.length} pinned repositories`);

    const readmePath = './README.md';
    let readme = fs.readFileSync(readmePath, 'utf8');

    const projectsTable = generateProjectsTable(repos);

    const startMarker = '### Featured Projects\n\n';
    const endMarker = '\n\n---\n\n### Tech Stack';

    const startIndex = readme.indexOf(startMarker);
    const endIndex = readme.indexOf(endMarker, startIndex);

    if (startIndex === -1 || endIndex === -1) {
      throw new Error('Could not find Featured Projects section markers');
    }

    const newReadme = readme.substring(0, startIndex + startMarker.length) +
                      projectsTable +
                      readme.substring(endIndex);

    fs.writeFileSync(readmePath, newReadme, 'utf8');
    console.log('README.md updated successfully!');
  } catch (error) {
    console.error('Error updating README:', error);
    process.exit(1);
  }
}

updateReadme();


