import { describe, expect, it } from "vitest";
import { driverFor } from "./dialect";

describe("driverFor", () => {
  it("routes Neon hosts to the serverless driver", () => {
    expect(driverFor("postgres://u:p@ep-cool-name-123.us-east-2.aws.neon.tech/db")).toBe("neon");
    expect(driverFor("postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require")).toBe(
      "neon",
    );
  });

  it("routes everything else to pg", () => {
    expect(driverFor("postgres://groundwork:groundwork@localhost:55432/groundwork")).toBe("pg");
    expect(driverFor("postgres://u:p@127.0.0.1:5432/db")).toBe("pg");
    expect(driverFor("postgres://u:p@db.internal.example.com/db")).toBe("pg");
  });

  /**
   * The check is on the host, not a substring: a local database whose name or
   * password merely contains "neon.tech" must not be handed the Neon driver,
   * which would try to open a WebSocket to a host that is not there.
   */
  it("does not mistake a host that merely contains the Neon domain", () => {
    expect(driverFor("postgres://u:p@localhost:5432/neon.tech")).toBe("pg");
    expect(driverFor("postgres://u:p@not-neon.tech.example.com/db")).toBe("pg");
    expect(driverFor("postgres://u:neon.tech@localhost/db")).toBe("pg");
  });

  it("falls back to pg for an unparseable URL, so pg reports the error", () => {
    expect(driverFor("not a url")).toBe("pg");
    expect(driverFor("")).toBe("pg");
  });
});
