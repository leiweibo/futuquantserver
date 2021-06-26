CREATE TABLE `security_valuation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `security_code` varchar(32) DEFAULT NULL,
  `security_mkt` varchar(45) DEFAULT NULL,
  `security_name` varchar(45),
  `trade_date` datetime DEFAULT NULL,
  `close_price` float DEFAULT NULL,
  `change_rate` float DEFAULT NULL,
  `mkt_value` decimal(32,3) DEFAULT NULL,
  `traded_mkt_value` decimal(32,3) DEFAULT NULL,
  `total_equity` decimal(32,0) DEFAULT NULL,
  `total_traded_equity` decimal(32,0) DEFAULT NULL,
  `pe_ttm` double DEFAULT NULL,
  `pe_static` double DEFAULT NULL,
  `pb` double DEFAULT NULL,
  `peg` double DEFAULT NULL,
  `pcf` varchar(45) DEFAULT NULL,
  `pts` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin


CREATE TABLE `fuquant`.`north_holding` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `trade_date` datetime DEFAULT NULL,
  `security_ccass_code` VARCHAR(32) NULL,
  `security_name` VARCHAR(128) NULL,
  `security_mkt` VARCHAR(45) NULL,
  `holding_amt` decimal(32,0) NULL,
  `holding_amt_rate` VARCHAR(45) NULL,
  `holding_offset` decimal(32,0),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

CREATE TABLE `fuquant`.`north_security` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `security_code` VARCHAR(45) NULL,
  `security_ccass_code` VARCHAR(45) NULL,
  `security_name` VARCHAR(45) NULL,
  `status` INT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;

CREATE TABLE `fuquant`.`north_holding_reports` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `trade_date` datetime DEFAULT NULL,
  `security_ccass_code` VARCHAR(32) NULL,
  `security_code` VARCHAR(32) NULL,
  `security_name` VARCHAR(128) NULL,
  `security_mkt` VARCHAR(45) NULL,
  `holding_amt` decimal(32,0) NULL,
  `holding_amt_rate` VARCHAR(45) NULL,
  `offset` decimal(32,0),
  `type` INT, -- 0 每日净买净卖
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;