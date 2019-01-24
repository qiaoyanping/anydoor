const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const promisify = require('util').promisify;
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const config = require('../config/defaultConf');
const tplPath = path.join(__dirname,'../template/dir.tpl')
const source = fs.readFileSync(tplPath,'utf-8');
const template = handlebars.compile(source);
const mime = require('./mime');
const compress = require('./compress');
const range = require('./range');

module.exports = async function (req, res, filePath) {
  try {
    const stats = await stat(filePath);
    if (stats.isFile()) {
      const contentType = mime(filePath);
      res.statusCode = 200;
      res.setHeader('content-Type',contentType);
      // fs.readFile(filePath,(err,data) => {
      //   res.end(data);
      // })
      let rs;
      const {code,start,end} = range(stats.size,req,res);
      if(code === 200) {
        rs = fs.createReadStream(filePath);
      } else {
        rs = fs.createReadStream(filePath, {start, end});
      }

      if(filePath.match(config.compress)){
        rs = compress(rs,req,res);
      }
      rs.pipe(res);
    }else if (stats.isDirectory()) {
      const files =await readdir(filePath);
      res.statusCode = 200;
      res.setHeader('content-Type','text/html');
      const dir = path.relative(config.root, filePath)
      const data = {
        title:path.basename(filePath),
        dir:dir ? `/${dir}`: '',
        files: files.map(file => {
            return {
              file,
              icon:mime(file)
            }
        }
        )}
     res.end(template(data));
    }
  } catch(ex) {
    console.error(ex);
    res.statusCode = 404;
      res.setHeader('Content-Type','text/plain');
      res.end(`${filePath} is not a directory or file\n ${ex.toString()}`);
  }
}
