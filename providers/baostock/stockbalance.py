import baostock as bs

class StockBalance:
  def __init__(self):
    self.lg = bs.login()

  def fetch_data(self, code, year, quater):
    balance_list = []
    rs_balance = bs.query_balance_data(code=code, year=year, quarter=quater)
    while (rs_balance.error_code == '0') & rs_balance.next():
      balance_list.append(rs_balance.get_row_data())
    result = {}
    for f, v in zip(rs_balance.fields, balance_list[0]):
      result[f] = v
    print(result)
    bs.logout()
  
if __name__ == '__main__':
  stk_balance = StockBalance()
  stk_balance.fetch_data('sh.600000', 2019, 3)