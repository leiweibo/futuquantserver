const puppeteer = require('puppeteer');

(async ()=> {
    let days = ['2021/06/14', '2021/06/15', '2021/06/16', '2021/06/17', '2021/06/18']
    days.forEach((d) => {
        const scrape = async (d) => {
            const browser = await puppeteer.launch({headless: false});
            const page = await browser.newPage();
            await page.goto('https://www.hkexnews.hk/sdw/search/mutualmarket_c.aspx?t=sz', {waitUntil: 'load', timeout: 0});
            console.log(d)
            await page.evaluate((d) => {
                console.log(`the date is ${d}`)
                document.querySelector('#txtShareholdingDate').value = d
                document.querySelector('#btnSearch').click();
            }, d);

            await page.waitForNavigation();
            let result = await page.evaluate(() => {
                let name = document.querySelectorAll('#mutualmarket-result > tbody > tr')[0].children[1].innerText
                let amt = document.querySelectorAll('#mutualmarket-result > tbody > tr')[0].children[2].innerText
                let date = document.querySelector('#txtShareholdingDate').value
                return {date, name, amt}
            })

            console.log(result)
            await browser.close()
            
        };
        scrape(d)
    })
})()
