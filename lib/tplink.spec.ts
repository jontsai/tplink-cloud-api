import tplink, { login } from "./tplink";
import { expect } from "chai";
import axios from "axios";
import AxiosMockAdapter from "axios-mock-adapter";
import "mocha";
import LB100 from "./lb100";
import HS100 from "./hs100";
describe("tplink", () => {
  describe("login()", () => {
    it("should instantiate a tplink object when valid params are passed", async () => {
      const mock = new AxiosMockAdapter(axios);
      // login
      mock
        .onPost("https://wap.tplinkcloud.com")
        .replyOnce(200, {
          error_code: 0,
          result: { token: "feedbeef1234" }
        })
        // device list
        .onAny("https://wap.tplinkcloud.com")
        .reply(400, { error_code: 2, msg: "bad request" });
      expect(login).to.exist;
      try {
        await login(undefined, undefined, undefined);
        expect.fail(null, null, "did not throw when missing params");
      } catch {
        // expect
      }

      try {
        const lTplink = await login("user", "password", "deadfeedbeef");
        expect(lTplink).to.be.instanceOf(tplink);
        expect(lTplink.getToken).to.exist;
        expect(lTplink.getToken()).to.equal("feedbeef1234");
        expect(lTplink.token).to.equal("feedbeef1234");
        expect(lTplink.getTermId()).to.equal("deadfeedbeef");
        expect(lTplink.termid).to.equal("deadfeedbeef");
      } catch (e) {
        expect.fail(null, null, e);
      }
    });
  });
  describe("getDeviceList()", async () => {
    const mock = new AxiosMockAdapter(axios);
    // login
    mock
      .onPost("https://wap.tplinkcloud.com")
      .replyOnce(200, {
        error_code: 0,
        result: { token: "feedbeef1234" }
      })
      // device list
      .onPost("https://wap.tplinkcloud.com")
      .replyOnce(200, {
        error_code: 0,
        result: {
          deviceList: [
            {
              alias: "living room bulb",
              status: 1,
              deviceType: "IOT.SMARTBULB"
            },
            { alias: "bedroom tv plug", status: 1, deviceType: "IOT.SMARTPLUG" }
          ]
        }
      })
      .onAny("https://wap.tplinkcloud.com")
      .reply(400, { error_code: 2, msg: "bad request" });
    const lTplink = await login("user", "password", "deadfeedbeef");
    const devices = await lTplink.getDeviceList();
    expect(devices).to.be.instanceOf(Array);
    expect(devices.length).to.equal(2);
    expect(devices).to.deep.equal([
      {
        alias: "living room bulb",
        status: 1,
        deviceType: "IOT.SMARTBULB"
      },
      { alias: "bedroom tv plug", status: 1, deviceType: "IOT.SMARTPLUG" }
    ]);
  });
  describe("finder methods", () => {
    it("can locate items by alias", () => {
      const lTplink = new tplink("token", "termid");
      lTplink.deviceList = [
        {
          deviceId: 123,
          alias: "living room bulb",
          status: 1,
          deviceType: "IOT.SMARTBULB"
        },
        {
          deviceId: 456,
          alias: "bedroom tv plug",
          status: 1,
          deviceType: "IOT.SMARTPLUG"
        }
      ];
      expect(() => lTplink.findDevice("dne")).to.throw(Error);
      expect(() => lTplink.findDevice("bedroom tv plug")).not.to.throw();
      let device = lTplink.findDevice("bedroom tv plug");
      expect(device).to.deep.equal({
        deviceId: 456,
        alias: "bedroom tv plug",
        status: 1,
        deviceType: "IOT.SMARTPLUG"
      });

      // TODO restrict get* to correct type (eg: getHS100('my bulb') works, but should not)
      let cDevice = lTplink.newDevice("living room bulb");
      expect(cDevice).to.be.instanceOf(LB100);
      expect(cDevice.id).to.equal(123);

      cDevice = lTplink.newDevice("bedroom tv plug");
      expect(cDevice).to.be.instanceof(HS100);
      expect(cDevice.id).to.equal(456);
    });
  });
});
