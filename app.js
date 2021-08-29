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
const LIMIT_BUY_CHANGE_RATE = 0.015;
const LIMIT_SELL_CHANGE_RATE = 1.01;

const init_money = 1000000;
let result_money = 1000000;

let market_code;
let total_volume;
let buy_price;
let sell_price;

let while_count = 0;

let target_current_price;

let afterCoinsInfo = [];
let beforeCoinsInfo = [];

// url send with array
async function myfetchWithArray(url, options) {
  await fetch(url, options)
    .then((res) => res.json())
    .then((json) => {
      if (parseInt(json[0].trade_price / 10) == 1) {
        return;
      } else if (parseInt(json[0].trade_price / 100) == 1) {
        return;
      }
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
      target_current_price = json[0].trade_price;
    })
    .catch((err) => {
      console.error("error:" + err);
    });
}

// 틱당 코인 변동률 확인
async function getTick() {
  let exceedBuyLimit = true;
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

  while (exceedBuyLimit) {
    await sleep(100);
    beforeCoinsInfo = afterCoinsInfo;
    afterCoinsInfo = [];

    console.log("afterCoinsInfo 탐색 중 ...");
    for (i = 0; i < marketList.length; i++) {
      const url = `https://api.upbit.com/v1/ticker?markets=${marketList[i].market}`;

      await sleep(200);
      await myfetchWithArray(url, options);
    }

    console.log("");
    console.log("급등 코인을 검색중입니다 ... " + cycle++ + " cycles");
    console.log("");
    console.log("검색할 코인 개수 : " + beforeCoinsInfo.length + " 개");

    await sleep(100);

    for (i = 0; i < beforeCoinsInfo.length; i++) {
      var change_rate = afterCoinsInfo[i][0].signed_change_rate - beforeCoinsInfo[i][0].signed_change_rate;
      market_code = afterCoinsInfo[i][0].market;

      if (change_rate >= LIMIT_BUY_CHANGE_RATE) {
        console.log("코인 : " + afterCoinsInfo[i][0].market + ", 변화율 : " + change_rate);
        console.log("LIMIT_BUY_CHANGE_RATE 에 도달했습니다 !");

        await buyOrder(afterCoinsInfo[i][0].market, afterCoinsInfo[i][0].trade_price);

        exceedBuyLimit = false;
        break;
      }
    }
    await sleep(100);
  }
  await readyToSell(market_code);

  console.log("매도 체결 !");
  console.log("원금 : " + init_money + " 원");
  console.log("현재 자산 : " + result_money + " 원");
  console.log("수익 : " + (result_money - init_money) + " 원");
  console.log("수익률 : " + ((result_money - init_money) % 1));
  console.log("반복 회차 : " + while_count + " 회");
  console.log("3초 뒤에 다음 회차가 진행됩니다.");
  afterCoinsInfo = [];

  await sleep(3000);

  getTick();
}

// 매수 신청
async function buyOrder(market_code, trade_price) {
  const body = {
    market: market_code, // 마켓 ID
    side: "bid", // 매수
    volume: (result_money * 0.999) / trade_price, // 주문량
    price: trade_price, // 주문 가격
    ord_type: "limit", // 지정가 주문
  };

  console.log(market_code + " 를 " + trade_price + " 에 매수합니다. ");
  console.log("상세 매수 정보");
  console.log(body);

  total_volume = (result_money * 0.999) / trade_price;
  buy_price = trade_price;

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
async function sellOrder(market_code, trade_price) {
  const body = {
    market: market_code, // 마켓 ID
    side: "ask", // 매도
    volume: total_volume, // 주문량
    price: trade_price, // 주문 가격
    ord_type: "limit", // 지정가 주문
  };

  console.log(market_code + " 를 " + trade_price + " 에 매도합니다. ");
  console.log("상세 매도 정보");
  console.log(body);

  sell_price = trade_price;
  result_money = sell_price * total_volume * 0.999;
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
async function readyToSell(market_code) {
  console.log(market_code + " 가 " + LIMIT_SELL_CHANGE_RATE + " % 상승 시 매도합니다. ");
  let exceedSellLimit = true;
  var cycle = 0;
  while_count++;

  while (exceedSellLimit) {
    cycle++;

    if (cycle % 100 == 0) {
      console.log("");
      console.log("Waiting To Sell " + market_code + " on " + cycle + " cycles ... ");
      console.log("매수 금액 : " + buy_price + " 원");
      console.log("현재 금액 : " + target_current_price + " 원");
      console.log("현재 자산 : " + total_volume * target_current_price + " 원");
      console.log("아직 목표 매도금액인 " + buy_price * LIMIT_SELL_CHANGE_RATE + " 원 이 아닙니다 !");
      console.log("반복 회차 : " + while_count + " 회");
      console.log("");
    }

    const url = `https://api.upbit.com/v1/ticker?markets=${market_code}`;
    const options = {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "*",
      },
    };

    target_current_price = 0;

    await sleep(100);

    myfetch(url, options);

    await sleep(100);

    if (target_current_price > buy_price * LIMIT_SELL_CHANGE_RATE) {
      console.log("코인 : " + market_code + ", 현재가 : " + target_current_price);
      console.log("LIMIT_SELL_CHANGE_RATE 를 넘었습니다 !");
      console.log(market_code + " 를 " + target_current_price + " 에 매도합니다.");
      await sellOrder(market_code, target_current_price);
      exceedSellLimit = false;
      break;
    }
  }
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

getTick();
