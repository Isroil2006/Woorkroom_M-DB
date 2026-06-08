const fs = require('fs');
const file = 'c:/Users/61674/Documents/Woorkroom_M-DB/client/pages/Tasks/tasks.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\\\${/g, '${');
fs.writeFileSync(file, content);
console.log('Fixed escaped variables in tasks.js');
