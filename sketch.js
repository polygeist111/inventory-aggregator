const D2CAuth = "Basic Y2F0YWxvZy1nZW5lcmF0b3ItaW50ZWdyYXRpb24tdGVzdDpoS00wN01LcHE0aHVhZ2tMRHVrQ3FjRnU1R1FBTWVORUM2dWVpRU1ma09EdGQwUmFhNVYxZWlQRVhCaWtESDM5";
const tradeAuth = "Basic aW52ZW50b3J5LWFnZ3JlZ2F0b3I6SHQySExVR2JENHoxQ1Y3aUcwd2NPSVEyM0FVQzdMWjZTZnBZSHhya1hodm82QXdjMXV2N3ZueGVSNUFRWEFYVw==";
const productURL = "https://api.commerce7.com/v1/product?cursor=";

//processing arrays for product array calldown and sort
let productList = [];
let wineList = [];

//holding arrays for sorted d2c and trade wine listings
let d2cWines = [];
let tradeWines = [];

let combinedWines = []; //[d2c, trade, variant id]

let tableCols = 12; //(maker, wine, vintage, d2c count, trade count, total count)

let totalD2C = 0;
let totalTrade = 0;
let totalBottles = 0;
let totalRed = 0;
let totalWhite = 0;
let totalRose = 0;
let totalSparkling = 0;
let totalNA = 0;


function setup() {
  //createCanvas(400, 400);
  noLoop();
  console.log("loaded");
  populateProducts("start", D2CAuth);
  setTimeout(function() {
    console.log(window.location.href);
    //createTable(5, tableCols);
  }, 500);
}

function draw() {
  //background(220);
}



/*
*   API Calls/Parsing
*/



//Recursively fills productsList with all products in given C7
function populateProducts(cursorIn, auth) {
  fetch50Wines(productURL + cursorIn, auth)
  .then(m => { 
    m[0].forEach(item => append(productList, item));
    console.log(productList);
    console.log(m[1]);
    if (m[1] != null) {
      populateProducts(m[1], auth);
    } else {
      populateWineList(auth);
    }
  })
  .catch(e => { console.log(e) });
}




//Requests 50 product pages from C7
async function fetch50Wines(url = "", auth) {
  let tenant = "";
  if (auth == D2CAuth) {
    tenant = "archetyp";
  } else if (auth == tradeAuth) {
    tenant = "archetyp-distribution";
  }
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": auth,
      "Tenant": tenant,
    },
  });
  const parsedJSON = await response.json();
  const newCursor = await parsedJSON.cursor;
  const products = await parsedJSON.products;
  return [products, newCursor]; //returns array of products as well as ending cursor value (essentially, next page index)

} 



/*
*    Sort + Process Inventory Data
*/



//Filters productList to wineList, making sure only available wines and bundles are included
function populateWineList(auth) {
  productList.forEach(item => {
    if(item.webStatus === "Available" && (item.type === "Wine" /*|| item.type === "Bundle"*/)) { 
      append(wineList, item) } 
  });
  sortWineList(auth);
}



//Sorts wineList alpha by maker, then wine, then vintage, then bundles by alpha at end (commented out sections are logic to sort bundles)
function sortWineList(auth) {
  let wines = [];
  //let bundles = [];
  wineList.sort((a,b) => makerName(a.title).localeCompare(makerName(b.title)));
  wineList.sort(function (a,b) {
    if (makerName(a.title).localeCompare(makerName(b.title)) == 0) {
      //return wineName(a).localeCompare(wineName(b));
      if (wineName(a).localeCompare(wineName(b) == 0)) {
        return wineVintage(a.title).localeCompare(wineVintage(b.title));
      }
      return 0;
    }
    return 0;
  });
  wineList.forEach(function(item) {
    if (item.type === "Wine") { append(wines, item); }
    //if (item.type === "Bundle") { append(bundles, item); }
  });
  for (var i = 0; i < wines.length; i++) {
    wineList.splice(i, 1, wines[i]);
  }/*
  for (var i = 0; i < bundles.length; i++) {
    wineList.splice(wines.length + i, 1, bundles[i]);
  }*/
  //console.log(wineList);
  if (auth == D2CAuth) {
    console.log("d2c");
    //wineList.forEach((wine) => append(d2cWines, wine));
    d2cWines = JSON.parse(JSON.stringify(wineList));
    productList = [];
    wineList = [];
    populateProducts("start", tradeAuth);
  } else if (auth == tradeAuth) {
    console.log("trade");
    //wineList.forEach((wine) => append(tradeWines, wine));
    tradeWines = JSON.parse(JSON.stringify(wineList));
    productList = [];
    wineList = [];
    console.log(d2cWines);
    console.log(tradeWines);
    aggregateLists();
  }
  /*
  //moves winelist into 2d array with space for prices
  for (var w = 0; w < wineList.length; w++) {
    let toPush = [wineList[w]]
      for (var i = 0; i <= wineList[w].variants.length; i++) {
        toPush.push("");
    }
    pricedWineList.push(toPush);
  }
  console.log(pricedWineList);
  getMakers();
  if (document.getElementById('authorize_button').innerText == "Refresh") { getPrices(); }
  loop();*/
}


//Combines d2c wines and trade wines into single 2d array of format [d2c, trade, variant id];
//Assumes there may be product count mismatches, but never variant count mismatches for a product
function aggregateLists() {
  let d2cInd = 0;
  let tradeInd = 0;
  let variantInd = 0;
  while (d2cInd < d2cWines.length && tradeInd < tradeWines.length) {
    let thisWine = [];
    let alpha = (d2cWines[d2cInd].title).localeCompare(tradeWines[tradeInd].title);
    //overall match
    /*
    *   --
    *   --
    *   --
    */
    if (alpha == 0) {
      //iterate through variant skus for submatches
      console.log("standard pair");
      console.log(d2cWines[d2cInd].variants.length + " " + d2cWines[d2cInd].title);
      for (variantInd = 0; variantInd < d2cWines[d2cInd].variants.length; variantInd++) {
        if (d2cWines[d2cInd].variants[variantInd].sku == tradeWines[tradeInd].variants[variantInd].sku) {
          thisWine = [d2cWines[d2cInd], tradeWines[tradeInd], variantInd];
          append(combinedWines, thisWine);
        } else {
          thisWine = [null, null, -1];
          console.log("ERROR: Variant SKU mismatch for " + d2cWines[d2cInd].title + " at variant index " + variantInd);
        }
      }
      d2cInd++;
      tradeInd++; 
    //d2c wine is earlier in alpha order
    /* 
    *   --
    *   -
    *   --
    */  
    } else if (alpha < 0) {
      console.log("left anomaly");
      for (variantInd = 0; variantInd < d2cWines[d2cInd].variants.length; variantInd++) {
        thisWine = [d2cWines[d2cInd], null, variantInd];
        append(combinedWines, thisWine);
      }
      d2cInd++;
    //d2c wine is later in alpha order
    /* 
    *   --
    *    -
    *   --
    */  
    } else if (alpha > 0) {
      console.log("right anomaly");
      for (variantInd = 0; variantInd < tradeWines[tradeInd].variants.length; variantInd++) {
        thisWine = [null, tradeWines[tradeInd], variantInd];
        append(combinedWines, thisWine);
      }
      tradeInd++;
    }
  }
  console.log(combinedWines);
  createTable(combinedWines.length + 2, tableCols);
}


/*
Errors to consider and handle:
- product only exists on one list
- multiple variants (list as separate)
*/



/*
*   Parse wine/product name strings
*/



//Returns wine title without vintage
function makerName(name) {
  if (name.substring(0,1) === "2") {
    return name.substring(5);
  } else return name;

}



//Returns wine vintage from title
function wineVintage(name) {
  if (name.substring(0,1) === "2") {
    return name.substring(0, 5);
  } else return "NV";
}



//Returns only actual maker name, no wine name
function justMakerName(wineIn) {
  let name = wineIn.title
  let makeName = makerName(name);
  let bottleName;
  
  bottleName = wineName(wineIn);
  let result =  makeName.substring(0, makeName.length - bottleName.length - 1);
  //if (!makers.includes(result)) { makers.push(result); console.log("hi"); } else { console.log("bye"); }
  if (result.substring(0, 11) == "Hofkellerei") {
    return "Hofkellerei";
  }
  return result;

}


//Returns wine title without vintage or maker
function wineName(wine) {
  let name = makerName(wine.title);
  let makerNameSpace;
  if (wine.vendor != null) {
    makerNameSpace = wine.vendor.title.length;
  } else return name;
  if (wine.vendor.title == "Vinodea / Andrea Schenter") {
    makerNameSpace = 7;
  }
  if (wine.vendor.title == "Hofkellerei") {
    makerNameSpace = 42;
  }
  return name.substring(makerNameSpace + 1);

}

















//(maker, wine, vintage, d2c count, trade count, total count)
function createTable(rows, cols) {
  document.getElementById("loadingIcon").style.display = "none";
  var body = document.getElementsByTagName('body')[0];
  var table = document.createElement('table');
  /*table.style.width = '100%';
  table.setAttribute('border', '1');*/
  var tbody = document.createElement('tbody');
  for (var i = 0; i < rows; i++) {
    var tr = document.createElement('tr');
    if (i == 0) {
      for (var j = 0; j < cols; j++) {
        var th = document.createElement('th');
        var p = document.createElement('p');
        switch (j) {
          case 0:
            th.setAttribute("rowSpan", "2");
            p.innerHTML = "Maker";
            break;
          case 1:
            th.setAttribute("rowSpan", "2");
            p.innerHTML = "Wine";
            break;
          case 2:
            th.setAttribute("rowSpan", "2");
            p.innerHTML = "Vintage";
            break;
          case 3:
            th.setAttribute("colSpan", "4");
            p.innerHTML = "D2C Inventory";
            break;
          case 4:
            th.setAttribute("colSpan", "4");
            p.innerHTML = "Trade Inventory";
            break;
          case 5: 
            th.setAttribute("rowSpan", "2");
            p.innerHTML = "Total Inventory";
            break;
          default:
            break;
        }
        if (j < 6) {
          th.appendChild(p);
          tr.appendChild(th);
        }
      }
    } else if (i == 1) {
      for (var j = 0; j < cols; j++) {
        var th = document.createElement('th');
        var p = document.createElement('p');
        switch (j) {
          /*
          case 0:
            p.innerHTML = "Maker";
            break;
          case 1:
            p.innerHTML = "Wine";
            break;
          case 2:
            p.innerHTML = "Vintage";
            break;*/
          case 0:
            p.innerHTML = "Available";
            break;
          case 1:
            p.innerHTML = "Allocated";
            break;
          case 2: 
            p.innerHTML = "Reserve";
            break;
          case 3: 
            p.innerHTML = "Total";
          break;
          case 4:
            p.innerHTML = "Available";
            break;
          case 5:
            p.innerHTML = "Allocated";
            break;
          case 6: 
            p.innerHTML = "Reserve";
            break;
          case 7: 
            p.innerHTML = "Total";
          break;
          default:
            break;
        }
        if (j < 8) {
          th.appendChild(p);
          tr.appendChild(th);
        }
      }
    } else {
      let d2cCount = 0;
      let tradeCount = 0;
      let inv = 0;
      let res = 0;
      let allo = 0;
      let avail = 0;
      for (var j = 0; j < cols; j++) {
        console.log("hit");
        let wine = "";
        if (combinedWines[i - 2][0] != null) {
          wine = combinedWines[i - 2][0];
        } else {
          wine = combinedWines[i - 2][1];
        }
        var td = document.createElement('td');
        //td.appendChild(document.createTextNode('\u0020'))
        var p = document.createElement('p');
        switch (j) {
          case 0:
            td.className = "wineText";
            p.innerHTML = justMakerName(wine);
            break;
          case 1:
            td.className = "wineText";
            p.innerHTML = wineName(wine);
            break;
          case 2:
            td.className = "wineText";
            p.innerHTML = wineVintage(wine.title);
            break;
          case 3:
            d2cCount = 0;
            if (combinedWines[i - 2][0] != null) {
              inv = combinedWines[i - 2][0].variants[combinedWines[i - 2][2]].inventory[0];
              res = inv.reserveCount;
              allo = inv.allocatedCount;
              avail = inv.availableForSaleCount;
              d2cCount = res + allo + avail;
              countType(combinedWines[i - 2][0], d2cCount);
            }
            totalD2C += d2cCount;
            p.innerHTML = avail;
            break;
          case 4:
            p.innerHTML = allo;
            break;
          case 5: 
            p.innerHTML = res;
            break;
          case 6:
            td.className = "smallTotal";
            p.innerHTML = d2cCount;
            if (d2cCount <= 12) {
              td.style.backgroundColor = "rgba(237, 33, 91, .5)";
              td.setAttribute("background-color", "red");
            }
            break;
          case 7:
            tradeCount = 0;
            if (combinedWines[i - 2][1] != null) {
              inv = combinedWines[i - 2][1].variants[combinedWines[i - 2][2]].inventory[0];
              res = inv.reserveCount;
              allo = inv.allocatedCount;
              avail = inv.availableForSaleCount;
              tradeCount = res + allo + avail;
              countType(combinedWines[i - 2][1], tradeCount);
            }
            totalTrade += tradeCount;
            p.innerHTML = avail;
            break;
          case 8:
            p.innerHTML = allo;
            break;
          case 9:
            p.innerHTML = res;
            break;
          case 10:
            td.className = "smallTotal";
            p.innerHTML = tradeCount;
            if (tradeCount <= 72) {
              td.style.backgroundColor = "rgba(237, 33, 91, .5)";
              td.setAttribute("background-color", "red");
            }
            break;
          case 11:
            td.className = "total";
            let total = d2cCount + tradeCount;
            totalBottles += total;
            p.innerHTML = total;
            break;
          default:
            break;
        }
        td.appendChild(p);
        tr.appendChild(td)
      }
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  body.appendChild(table)
  createSummaryTable();
}

function createSummaryTable() {
  var body = document.getElementsByTagName('body')[0];
  var table = document.createElement('table');
  /*table.style.width = '100%';
  table.setAttribute('border', '1');*/
  var tbody = document.createElement('tbody');
  for (var i = 0; i < 2; i++) {
    let tr = document.createElement('tr');
    for (var j = 0; j < 8; j++) {
      if (i == 0) {
        let th = document.createElement('th');
        let p = document.createElement('p');
        switch(j) {
          case 0:
            p.innerHTML = "Total Reds";
            break;
          case 1:
            p.innerHTML = "Total Whites";
            break;
          case 2:
            p.innerHTML = "Total Rosés";
            break;
          case 3:
            p.innerHTML = "Total Sparklings";
            break;
          case 4:
            p.innerHTML = "Total NAs";
            break;
          case 5:
            p.innerHTML = "Total D2C";
            break;
          case 6:
            p.innerHTML = "Total Trade";
            break;
          case 7:
            p.innerHTML = "Grand Total";
            break;
          default:
            break;
        }
        th.appendChild(p);
        tr.appendChild(th);
      } else if (i == 1) {
        let td = document.createElement('td');
        let p = document.createElement('p');
        switch(j) {
          case 0:
            p.innerHTML = totalRed;
            break;
          case 1:
            p.innerHTML = totalWhite;
            break;
          case 2:
            p.innerHTML = totalRose;
            break;
          case 3:
            p.innerHTML = totalSparkling;
            break;
          case 4:
            p.innerHTML = totalNA;
            break;
          case 5:
            td.className = "smallTotal";
            p.innerHTML = totalD2C;
            break;
          case 6:
            td.className = "smallTotal";
            p.innerHTML = totalTrade;
            break;
          case 7:
            td.className = "total";
            p.innerHTML = totalBottles;
            break;
          default:
            break;
        }
        td.appendChild(p);
        tr.appendChild(td);
      }
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  body.appendChild(table);
}



//counts wine type and tallies to global var
function countType(wine, count) {
  let type = wine.wine.type;
  switch(type) {
    case "Red":
      totalRed += count;
      break;
    case "White":
      totalWhite += count;
      break;
    case "Rose":
      totalRose += count;
      break;
    case "Sparkling":
      totalSparkling += count;
      break;
    default:
      break;
  }
  if (justMakerName(wine) == "Steinbock") {
    totalNA += count;
  }
}



//REQUIRES EXTENSIVE EDITING BEFORE USE
//Applies trade prices (for all variants) to their correct places in pricedWineList array, automatically skips over unavailable wines. 
//Trade price sheet must be correctly sorted and have accurate SKUs
function filterPrices(priceIn) {
  console.log(priceIn);
  var winDex = 0;
  //iterates across pricedWineList
  for (var i = 0; i < pricedWineList.length; i++) {
    //iterates through each variant for a given entry in pricedWineList
    for (var s = 0; s < pricedWineList[i][0].variants.length; s++) {
      //Skips past nonmatching entries

      //if an error is thrown in this code, ensure than the file Archetyp Stocklist for Retail/Restaurant (on the TradingPriceConcise page) is appropriately organized
      console.log(priceIn[winDex][0] + " " + (pricedWineList[i][0].variants[s].sku));
      while (priceIn[winDex][0] != (pricedWineList[i][0].variants[s].sku)) {
        console.log("entered loop");
        winDex++;
      }
      //appends price to correct array slot for given wine in pricedWineList
      if (priceIn[winDex][0] == (pricedWineList[i][0].variants[s].sku)) {
        console.log("Added " + priceIn[winDex][0] + " " + pricedWineList[i][0].variants[s].sku);
        pricedWineList[i][2 + s] = priceIn[winDex][1];
        winDex++;
      }
    }
  }
}