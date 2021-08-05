import sys
import baostock as bs
import datetime, time

sys.path.append('gen-py')

from stkline import StkService
from stkline.ttypes import Stockline

from thrift.transport import TSocket
from thrift.transport import TTransport
from thrift.protocol import TBinaryProtocol
from thrift.server import TServer

class StklineHandler:
  def __init__(self):
    self.lg = bs.login()
    # 显示登陆返回信息
    print('login respond error_code:'+self.lg.error_code)
    print('login respond  error_msg:'+self.lg.error_msg)

  def convert(self, str):
    return round(float(str), 4)
  
  def getStockline(self, stkCode, startDate, endDate):
    print(f'start to get data of {stkCode}, start date: {startDate}, end date: {endDate}')
    rs = bs.query_history_k_data_plus(stkCode,
      "date,code,preclose,open,close,high,low,volume,turn,pctChg,amount,adjustflag,tradestatus,isST",
      start_date=startDate, end_date=endDate,
      frequency="d", adjustflag="3")
    
    data_list = []
    while (rs.error_code == '0') & rs.next():
      result = rs.get_row_data()
      timestamp = time.mktime(datetime.datetime.strptime(result[0],'%Y-%m-%d').timetuple())
      # 获取一条记录，将记录合并在一起
      sktline = Stockline(self.convert(result[3]), self.convert(result[4]), 
        self.convert(result[5]), self.convert(result[6]), int(result[7]), self.convert(result[10]), 
        self.convert(result[9]), int(timestamp), result[0])
      data_list.append(sktline)
    return data_list

if __name__ == '__main__':
  handler = StklineHandler()
  processor = StkService.Processor(handler)
  transport = TSocket.TServerSocket(host='127.0.0.1', port=9090)

  tfactory = TTransport.TBufferedTransportFactory()
  pfactory = TBinaryProtocol.TBinaryProtocolFactory()

  server = TServer.TSimpleServer(processor, transport, tfactory, pfactory)

  # You could do one of these for a multithreaded server
  # server = TServer.TThreadedServer(
  #     processor, transport, tfactory, pfactory)
  # server = TServer.TThreadPoolServer(
  #     processor, transport, tfactory, pfactory)

  print('Starting the server...')
  server.serve()
  print('done.')