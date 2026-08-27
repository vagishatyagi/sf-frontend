import nextConfig from "../../next.config";

describe("Next server actions", () => {
  it("allows enough request body space for a two MiB base64 photo", () => {
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBe("4mb");
  });
});
