const request = require("request");
const uuidv4 = require("uuid/v4");
const crypto = require("crypto");
const sign = require("jsonwebtoken").sign;
const queryEncode = require("querystring").encode;
const fetch = require("node-fetch");

const marketList = require(`./marketList.json`);

const access_key = "UvuQEnSEGCWsSpJI56GrGxxFMFSs1DBmrFMxzVke";
const secret_key = "BqCV3bR4xcYcjtjKRkSLjjazRm16WS13VM51DgaW";
const server_url = "https://api.upbit.com";

const LIMIT_BUY_CHANGE_RATE = 0.01;
const LIMIT_SELL_CHANGE_RATE = 1.02;
// const LIMIT_SONJUL_RATE = -1.03; // 손절 변동률

// 변동률이 작은 3개 메이저코인은 검색에서 제외
// {
//   "market": "KRW-BTC",
//   "korean_name": "비트코인",
//   "english_name": "Bitcoin"
// },
// {
//   "market": "KRW-ETH",
//   "korean_name": "이더리움",
//   "english_name": "Ethereum"
// },
// {
//   "market": "KRW-ADA",
//   "korean_name": "에이다",
//   "english_name": "Ada"
// },
// {
//   "market": "KRW-BTT",
//   "korean_name": "비트토렌트",
//   "english_name": "BitTorrent"
// },

const init_money = 1000000;
let result_money = 1000000;

let MY_COIN_INFO;

let while_count = 0;

let afterCoinsInfo = [];
let beforeCoinsInfo = [];

// url send with array
async function myfetchWithArray(url, options) {
  await fetch(url, options)
    .then((res) => res.json())
    .then((json) => {
      afterCoinsInfo.push(json);
    })
    .catch((err) => {
      console.error("error:" + err);
    });
}

// url send
async function myfetch(url, options) {
  await fetch(url, options)
    .then((res) => res.json())
    .then((json) => {
      MY_COIN_INFO.current_trade_price = json[0].trade_price;
      MY_COIN_INFO.change_rate = json[0].signed_change_rate;
    })
    .catch((err) => {
      console.error("error:" + err);
    });
}

// 틱당 코인 변동률 확인
async function getTick() {
  initMyCoinInfo(); // MY_COIN_INFO 초기화

  let exceedBuyLimit = false; // LIMIT_BUY_CHANGE_RAGE 도달 여부
  var cycle = 0;

  const options = {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "*",
    },
  };

  console.log("beforeCoinsInfo 탐색 중 ...");
  for (i = 0; i < marketList.length; i++) {
    const url = `https://api.upbit.com/v1/ticker?markets=${marketList[i].market}`;

    await sleep(200);
    await myfetchWithArray(url, options);
  }

  while (!exceedBuyLimit) {
    await sleep(200);
    beforeCoinsInfo = afterCoinsInfo;
    afterCoinsInfo = [];
    let max_change_rate = 0;

    for (i = 0; i < marketList.length; i++) {
      const url = `https://api.upbit.com/v1/ticker?markets=${marketList[i].market}`;

      await sleep(200);
      await myfetchWithArray(url, options);
    }

    if (cycle % 10 == 0) {
      console.log("");
      console.log("급등 코인을 검색중입니다 ... " + cycle++ + " cycles");
    }

    await sleep(200);

    for (i = 0; i < beforeCoinsInfo.length; i++) {
      var change_rate = afterCoinsInfo[i][0].signed_change_rate - beforeCoinsInfo[i][0].signed_change_rate;

      if (change_rate >= LIMIT_BUY_CHANGE_RATE) {
        console.log("코인 : " + afterCoinsInfo[i][0].market + ", 변화율 : " + change_rate);
        console.log("LIMIT_BUY_CHANGE_RATE 에 도달했습니다 !");

        // MY_COIN_INFO 에 가장 변동률이 큰 코인의 market, trade_price 주입
        if (max_change_rate < change_rate) {
          max_change_rate = change_rate;
          MY_COIN_INFO.market_code = afterCoinsInfo[i][0].market;
          MY_COIN_INFO.buy_price = afterCoinsInfo[i][0].trade_price;
        }
        exceedBuyLimit = true;
      }
    }
    await sleep(200);
    if (exceedBuyLimit) await buyOrder(MY_COIN_INFO); // 급등률이 가장 높은 코인으로 매수

    await sleep(200);
  }
  await readyToSell(MY_COIN_INFO);

  console.log(while_count + "회차 종료 결과");
  console.log("원금 : " + init_money + " 원");
  console.log("현재 자산 : " + result_money + " 원");
  console.log("수익 : " + (result_money - init_money) + " 원");
  console.log("수익률 : " + result_money / init_money);
  afterCoinsInfo = [];

  await sleep(1000);

  getTick();
}

// 매수 신청
async function buyOrder(MY_COIN_INFO) {
  const body = {
    market: MY_COIN_INFO.market_code, // 마켓 ID
    side: "bid", // 매수
    volume: (result_money * 0.999) / MY_COIN_INFO.buy_price, // 매수량
    price: MY_COIN_INFO.buy_price, // 매수 가격
    ord_type: "limit", // 지정가 주문
  };

  console.log(MY_COIN_INFO.market_code + " 를 " + MY_COIN_INFO.buy_price + " 에 매수합니다. ");
  console.log("상세 매수 정보");
  console.log(body);

  MY_COIN_INFO.total_volume = (result_money * 0.999) / MY_COIN_INFO.buy_price;
  result_money = 0;

  // const query = queryEncode(body);

  // const hash = crypto.createHash("sha512");
  // const queryHash = hash.update(query, "utf-8").digest("hex");

  // const payload = {
  //   access_key: access_key,
  //   nonce: uuidv4(),
  //   query_hash: queryHash,
  //   query_hash_alg: "SHA512",
  // };

  // const token = sign(payload, secret_key);

  // const url = server_url + "/v1/orders";
  // const options = {
  //   method: "POST",
  //   headers: { Authorization: `Bearer ${token}` },
  //   json: body,
  // };

  // myfetch(url, options);
}

// 매도 신청
async function sellOrder(MY_COIN_INFO) {
  const body = {
    market: MY_COIN_INFO.market_code, // 마켓 ID
    side: "ask", // 매도
    volume: MY_COIN_INFO.total_volume, // 주문량
    price: MY_COIN_INFO.sell_price, // 주문 가격
    ord_type: "limit", // 지정가 주문
  };

  console.log("상세 매도 정보");
  console.log(body);

  result_money += MY_COIN_INFO.sell_price * MY_COIN_INFO.total_volume * 0.999;

  // const query = queryEncode(body);

  // const hash = crypto.createHash("sha512");
  // const queryHash = hash.update(query, "utf-8").digest("hex");

  // const payload = {
  //   access_key: access_key,
  //   nonce: uuidv4(),
  //   query_hash: queryHash,
  //   query_hash_alg: "SHA512",
  // };

  // const token = sign(payload, secret_key);

  // const url = server_url + "/v1/orders";
  // const options = {
  //   method: "POST",
  //   headers: { Authorization: `Bearer ${token}` },
  //   json: body,
  // };

  // myfetch(url, options);
}

// 매도 여부 결정
async function readyToSell(MY_COIN_INFO) {
  console.log(MY_COIN_INFO.market_code + " 가격이 5연속 하락 시 매도합니다. ");
  // let fall_count = 0;
  // let even_count = 0;
  // let rise_count = 0;
  // let total_count = 0;
  let before_change_rate;

  let exceedSellLimit = false; // LIMIT_SELL_CHANGE_RATE 도달 여부
  var cycle = 0; // 현재가 가져오기 (myfetch(url,options)) 반복 횟수
  while_count++; // getTick() 함수 반복 횟수++

  // 매수 즉시 2% 상승 가격에 매도 주문
  if (MY_COIN_INFO.current_trade_price > MY_COIN_INFO.buy_price * LIMIT_SELL_CHANGE_RATE) {
    console.log("코인 : " + MY_COIN_INFO.market_code + ", 매도 주문 : " + MY_COIN_INFO.buy_price * LIMIT_SELL_CHANGE_RATE);

    MY_COIN_INFO.sell_price = MY_COIN_INFO.buy_price * LIMIT_SELL_CHANGE_RATE;
    await sellOrder(MY_COIN_INFO);
  }

  // while (!exceedSellLimit) {
  //   cycle++;

  //   const url = `https://api.upbit.com/v1/ticker?markets=${MY_COIN_INFO.market_code}`;
  //   const options = {
  //     method: "GET",
  //     headers: {
  //       Accept: "application/json, text/plain, */*",
  //       "User-Agent": "*",
  //     },
  //   };

  //   // 현재가 초기화
  //   MY_COIN_INFO.current_trade_price = 0;
  //   before_change_rate = MY_COIN_INFO.change_rate;

  //   await sleep(200);

  //   // 현재가 가져오기
  //   myfetch(url, options);

  //   await sleep(200);

  //   // 매수한 지 15분이 지나면 당시 거래가로 매도
  //   if (cycle == 4500) {
  //     console.log("15분 경과 !!! " + MY_COIN_INFO.market_code + " 를 " + MY_COIN_INFO.buy_price + " 원에 매수, "  + MY_COIN_INFO.current_trade_price + " 원에 매도");
  //     MY_COIN_INFO.sell_price = MY_COIN_INFO.current_trade_price;
  //     await sellOrder(MY_COIN_INFO);
  //     exceedSellLimit = true;
  //     break;
  //   }

  // console.log("변동률 : " + (MY_COIN_INFO.change_rate - before_change_rate) + ", 가격 : " + MY_COIN_INFO.current_trade_price + " 원");

  // // 가격 보합 시 even_count++;
  // if (MY_COIN_INFO.change_rate - before_change_rate == 0) {
  //   even_count++;
  // }
  // // 가격 하락 시 fall_count++;
  // else if (MY_COIN_INFO.change_rate - before_change_rate < 0) {
  //   fall_count++;
  // }
  // // 가격 상승 시 rise_count++;
  // else {
  //   rise_count++;
  // }
  // total_count++;

  // // 10초 동안의 틱 분석
  // if (total_count == 50) {
  //   if (fall_count - rise_count > 4) {
  //     console.log("코인 : " + MY_COIN_INFO.market_code + ", 현재가 : " + MY_COIN_INFO.current_trade_price);
  //     console.log("10초동안 가격이 최소 4 연속 하락했습니다 !");
  //     console.log(MY_COIN_INFO.market_code + " 를 " + MY_COIN_INFO.current_trade_price + " 원에 매도합니다.");

  //     MY_COIN_INFO.sell_price = MY_COIN_INFO.current_trade_price;
  //     await sellOrder(MY_COIN_INFO);
  //     exceedSellLimit = true;
  //     break;
  //   } else {
  //     total_count = 0;
  //     fall_count = 0;
  //     even_count = 0;
  //     rise_count = 0;
  //     console.log("count 초기화 !");
  //   }
  // }

  // LIMIT_SELL_CHANGE_RATE 도달 시 매도
  // if (MY_COIN_INFO.current_trade_price > MY_COIN_INFO.buy_price * LIMIT_SELL_CHANGE_RATE) {
  //   console.log("코인 : " + MY_COIN_INFO.market_code + ", 현재가 : " + MY_COIN_INFO.current_trade_price);
  //   console.log("LIMIT_SELL_CHANGE_RATE 를 넘었습니다 !");
  //   console.log(MY_COIN_INFO.market_code + " 를 " + MY_COIN_INFO.current_trade_price + " 원에 매도합니다.");

  //   MY_COIN_INFO.sell_price = MY_COIN_INFO.current_trade_price;
  //   await sellOrder(MY_COIN_INFO);
  //   exceedSellLimit = true;
  //   break;
  // }

  // 싸이클 100 회마다 현재 코인 정보 출력
  // if (cycle % 100 == 0) {
  //   console.log("");
  //   console.log("Waiting To Sell " + MY_COIN_INFO.market_code + " on " + cycle + " cycles ... ");
  //   console.log("매수 금액 : " + MY_COIN_INFO.buy_price + " 원");
  //   console.log("현재 금액 : " + MY_COIN_INFO.current_trade_price + " 원");
  //   console.log("현재 자산 : " + MY_COIN_INFO.total_volume * MY_COIN_INFO.current_trade_price + " 원");
  //   console.log("반복 회차 : " + while_count + " 회");
  //   console.log("");
  // }
  // }
}

// 전체 계좌 조회
function getAccount() {
  const payload = {
    access_key: access_key,
    nonce: uuidv4(),
  };

  const token = sign(payload, secret_key);

  const url = server_url + "/v1/accounts";

  const options = {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  };
  myfetch(url, options);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function initMyCoinInfo() {
  MY_COIN_INFO = {
    market_code: "",
    total_volume: 0,
    buy_price: 0,
    sell_price: 0,
    current_trade_price: 0,
    change_rate: 0,
  };
}

getTick();
