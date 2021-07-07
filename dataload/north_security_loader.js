// 北向资金标加载
const fs = require('fs');
const { northSecurity } = require('../database/models/NorthSecurity');

const digitalReg = /^[\d]*$/;

const start = async (file) => {
  console.log('start....');
  fs.readFile(file, 'utf16le', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    const finalData = data.split('\n')
      .filter((line) => {
        const array = line.trim().split(/\s+/);
        return array.length === 5 && digitalReg.test(array[1]);
      }).map((line) => {
        // line.trim().split(/\s+/).length;
        const array = line.trim().split(/\s+/);
        return {
          security_code: array[1],
          security_ccass_code: array[2],
          security_name: array[3],
          status: 0,
        };
      });

    northSecurity.bulkCreate(finalData);
  });
};

(async () => {
  await northSecurity.destroy({
    where: {},
    truncate: true,
  });
  await start('../database/SSE_Securities_c.csv');
  await start('../database/SZSE_Securities_c.csv');
})();
