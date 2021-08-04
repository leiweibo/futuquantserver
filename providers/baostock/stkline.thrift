
struct Stockline {
  1: double openPrice,
  2: double closePrice,
  3: double highPrice,
  4: double lowPrice,
  5: i32 volumn,
  6: double turnover,
  7: double changeRate,
  8: i32 timestamp,
  9: string time,
}
service StkService {
  list<Stockline> getStockline(1:string stkCode, 2:string startDate, 3:string endDate)
}