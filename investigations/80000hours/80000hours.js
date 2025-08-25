const fs = require("fs");

fetch(
  "https://w6km1udib3-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(5.32.0)%3B%20Lite%20(5.32.0)%3B%20Browser%3B%20instantsearch.js%20(4.78.3)%3B%20Vue%20(3.5.15)%3B%20Vue%20InstantSearch%20(4.20.8)%3B%20JS%20Helper%20(3.25.0)&x-algolia-api-key=d1d7f2c8696e7b36837d5ed337c4a319&x-algolia-application-id=W6KM1UDIB3",
  {
    headers: {
      accept: "application/json",
      "accept-language":
        "pt-BR,pt;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      "content-type": "text/plain",
      "sec-ch-ua":
        '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      Referer: "https://jobs.80000hours.org/",
    },
    body: JSON.stringify({
      requests: [
        {
          indexName: "jobs_prod_super_ranked",
          facetFilters: [
            [
              "tags_exp_required:Junior (1-4 years experience)",
              "tags_exp_required:Mid (5-9 years experience)",
              "tags_exp_required:Multiple experience levels",
            ],
            ["tags_location_80k:Canada", "tags_location_80k:Remote, Global"],
            ["tags_role_type:Full-time"],
            ["tags_skill:Software engineering"],
          ],
          facets: [
            "career_development_role",
            "company_data",
            "highlighted",
            "salary_algolia",
            "tags_area",
            "tags_degree_required",
            "tags_exp_required",
            "tags_location_80k",
            "tags_role_type",
            "tags_skill",
          ],
          highlightPostTag: "__/ais-highlight__",
          highlightPreTag: "__ais-highlight__",
          maxValuesPerFacet: 1000,
          page: 0,
          query: "",
        },
        {
          indexName: "jobs_prod_super_ranked",
          analytics: false,
          clickAnalytics: false,
          facetFilters: [
            ["tags_location_80k:Canada", "tags_location_80k:Remote, Global"],
            ["tags_role_type:Full-time"],
            ["tags_skill:Software engineering"],
          ],
          facets: "tags_exp_required",
          highlightPostTag: "__/ais-highlight__",
          highlightPreTag: "__ais-highlight__",
          hitsPerPage: 0,
          maxValuesPerFacet: 1000,
          page: 0,
          query: "",
        },
        {
          indexName: "jobs_prod_super_ranked",
          analytics: false,
          clickAnalytics: false,
          facetFilters: [
            [
              "tags_exp_required:Junior (1-4 years experience)",
              "tags_exp_required:Mid (5-9 years experience)",
              "tags_exp_required:Multiple experience levels",
            ],
            ["tags_role_type:Full-time"],
            ["tags_skill:Software engineering"],
          ],
          facets: "tags_location_80k",
          highlightPostTag: "__/ais-highlight__",
          highlightPreTag: "__ais-highlight__",
          hitsPerPage: 0,
          maxValuesPerFacet: 1000,
          page: 0,
          query: "",
        },
        {
          indexName: "jobs_prod_super_ranked",
          analytics: false,
          clickAnalytics: false,
          facetFilters: [
            [
              "tags_exp_required:Junior (1-4 years experience)",
              "tags_exp_required:Mid (5-9 years experience)",
              "tags_exp_required:Multiple experience levels",
            ],
            ["tags_location_80k:Canada", "tags_location_80k:Remote, Global"],
            ["tags_skill:Software engineering"],
          ],
          facets: "tags_role_type",
          highlightPostTag: "__/ais-highlight__",
          highlightPreTag: "__ais-highlight__",
          hitsPerPage: 0,
          maxValuesPerFacet: 1000,
          page: 0,
          query: "",
        },
        {
          indexName: "jobs_prod_super_ranked",
          analytics: false,
          clickAnalytics: false,
          facetFilters: [
            [
              "tags_exp_required:Junior (1-4 years experience)",
              "tags_exp_required:Mid (5-9 years experience)",
              "tags_exp_required:Multiple experience levels",
            ],
            ["tags_location_80k:Canada", "tags_location_80k:Remote, Global"],
            ["tags_role_type:Full-time"],
          ],
          facets: "tags_skill",
          highlightPostTag: "__/ais-highlight__",
          highlightPreTag: "__ais-highlight__",
          hitsPerPage: 0,
          maxValuesPerFacet: 1000,
          page: 0,
          query: "",
        },
      ],
    }),
    method: "POST",
  }
)
  .then((res) => res.json())
  .then((data) => {
    fs.writeFileSync("jobs.json", JSON.stringify(data, null, 2));
  });
