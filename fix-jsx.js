import fs from 'fs';

const file = '/Users/harsh.patel1/.gemini/antigravity/scratch/lottie-watermark-remover/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

// The error "Unterminated regular expression" usually happens when a JSX return statement is broken or extra closing braces exist without matching open tags that causes the JS parser to interpret a division sign / instead of a closing tag </ .

const newTail = `
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
`;

// Replace from "          </div>" after HandleDownload button
content = content.replace(/          <\/div>\n        \)}\n[\s\S]*$/, newTail);

fs.writeFileSync(file, content);
console.log("File fixed!");
