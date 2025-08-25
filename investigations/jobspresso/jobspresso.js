const fs = require("fs");

fetch("https://jobspresso.co/jm-ajax/get_listings/", {
  headers: {
    accept: "*/*",
    "accept-language":
      "pt-BR,pt;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    priority: "u=1, i",
    "sec-ch-ua":
      '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Linux"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "x-requested-with": "XMLHttpRequest",
    cookie:
      "tk_or=%22https%3A%2F%2Fwww.google.com%2F%22; tk_r3d=%22https%3A%2F%2Fwww.google.com%2F%22; tk_lr=%22https%3A%2F%2Fwww.google.com%2F%22; sbjs_migrations=1418474375998%3D1; sbjs_current_add=fd%3D2025-07-01%2015%3A41%3A30%7C%7C%7Cep%3Dhttps%3A%2F%2Fjobspresso.co%2F%7C%7C%7Crf%3Dhttps%3A%2F%2Fwww.google.com%2F; sbjs_first_add=fd%3D2025-07-01%2015%3A41%3A30%7C%7C%7Cep%3Dhttps%3A%2F%2Fjobspresso.co%2F%7C%7C%7Crf%3Dhttps%3A%2F%2Fwww.google.com%2F; sbjs_current=typ%3Dorganic%7C%7C%7Csrc%3Dgoogle%7C%7C%7Cmdm%3Dorganic%7C%7C%7Ccmp%3D%28none%29%7C%7C%7Ccnt%3D%28none%29%7C%7C%7Ctrm%3D%28none%29%7C%7C%7Cid%3D%28none%29%7C%7C%7Cplt%3D%28none%29%7C%7C%7Cfmt%3D%28none%29%7C%7C%7Ctct%3D%28none%29; sbjs_first=typ%3Dorganic%7C%7C%7Csrc%3Dgoogle%7C%7C%7Cmdm%3Dorganic%7C%7C%7Ccmp%3D%28none%29%7C%7C%7Ccnt%3D%28none%29%7C%7C%7Ctrm%3D%28none%29%7C%7C%7Cid%3D%28none%29%7C%7C%7Cplt%3D%28none%29%7C%7C%7Cfmt%3D%28none%29%7C%7C%7Ctct%3D%28none%29; sbjs_udata=vst%3D1%7C%7C%7Cuip%3D%28none%29%7C%7C%7Cuag%3DMozilla%2F5.0%20%28X11%3B%20Linux%20x86_64%29%20AppleWebKit%2F537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome%2F135.0.0.0%20Safari%2F537.36; _ga=GA1.2.1199733213.1751384491; _gid=GA1.2.1393272147.1751384491; cf_clearance=SOUPnar6QnxyNkfcxBrZLLQDFzdBuyCGX1SeaBJZBRo-1751384496-1.2.1.1-eWQ5Ffi..OHeeBx3eJpyFo86e9Uh0JkqdkMTokQaLUZV_pNKxZUDgGtco4e0cr1J9BbUzIMC0m5n5PeCQvxuI_viA_UqOVUjV9UjTR569hLuClVJqm2SgoOfbQ6BfzWu7eebYwoS9Ve58qQLAosoucJtuKUNWWZsg_D.St0Vq33hGQS2WjcKopiaVXJwirLjiEq3DnJHu892dUXO5LuNt0MZA1iDLCh63k8C7sQC5QeI5xpD9iHwRzie8c7ovi4Q18QfJkZlT7INkQiliNww0RcD2XSF9xOkoXkwBeEOCP.vUI61buEAzrQqff2wGadQQZNMb5n93UufKLz7Tihk.bJ2xTh8m3nvoLIV2XhK878; _ga_WW5NYL4Z1K=GS2.2.s1751384491$o1$g1$t1751384547$j4$l0$h0; _gat=1; sbjs_session=pgs%3D6%7C%7C%7Ccpg%3Dhttps%3A%2F%2Fjobspresso.co%2Fremote-software-jobs%2F",
    Referer: "https://jobspresso.co/remote-software-jobs/",
    "Referrer-Policy": "no-referrer-when-downgrade",
  },
  body: "lang=&search_keywords=&search_location=&filter_job_type%5B%5D=developer&filter_job_type%5B%5D=&per_page=20&orderby=featured&featured_first=false&order=DESC&page=1&show_pagination=false&form_data=search_keywords%3D%26search_location%3D%26filter_job_type%255B%255D%3Ddeveloper%26filter_job_type%255B%255D%3D",
  method: "POST",
})
  .then((res) => res.json())
  .then((data) => {
    fs.writeFileSync("links.html", data.showing_links);
    fs.writeFileSync("jobs.html", data.html);
  });
