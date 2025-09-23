import { describe, expect, it } from "vitest";
import { normalizeIdeas } from "../../server/services/google-ads";

describe("normalizeIdeas", () => {
  it("normalizes Google Ads keyword ideas", () => {
    const apiResponse = {
      results: [
        {
          text: "elevit",
          keywordIdeaMetrics: {
            avgMonthlySearches: 5400,
            competition: "LOW",
            competitionIndex: 10,
            lowTopOfPageBidMicros: 1_500_000,
            highTopOfPageBidMicros: 4_500_000,
          },
        },
        {
          text: "dha bầu",
          keywordIdeaMetrics: {},
        },
      ],
    };

    const { meta, rows } = normalizeIdeas(
      apiResponse,
      "languageConstants/1014",
      ["geoTargetConstants/2392"],
      "GOOGLE_SEARCH",
      25,
    );

    expect(meta).toMatchObject({
      language: "languageConstants/1014",
      geoTargets: ["geoTargetConstants/2392"],
      network: "GOOGLE_SEARCH",
      totalResults: 2,
      requestedKeywordCount: 2,
      pageSize: 25,
    });

    expect(rows).toEqual([
      {
        keyword: "elevit",
        avgMonthlySearches: 5400,
        competition: "LOW",
        competitionIndex: 10,
        lowTopBid: 1.5,
        highTopBid: 4.5,
        monthlySearchVolumes: [],
        range: null,
      },
      {
        keyword: "dha bầu",
        avgMonthlySearches: null,
        competition: null,
        competitionIndex: null,
        lowTopBid: null,
        highTopBid: null,
        monthlySearchVolumes: [],
        range: null,
      },
    ]);
  });
});
