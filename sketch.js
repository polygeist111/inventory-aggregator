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

let tableRows = 1;
let tableCols = 6; //(maker, wine, vintage, d2c count, trade count, total count)


function setup() {
  //createCanvas(400, 400);
  noLoop();
  console.log("loaded");
  populateProducts("start", D2CAuth);
  setTimeout(function() {
    console.log(window.location.href);
    createTable(5, tableCols);
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
      for (variantInd = 0; variantInd < d2cWines[d2cInd].variants.length; variantInd++) {
        if (d2cWines[d2cInd].variants[variantInd].sku == tradeWines[tradeInd].variants[variantInd].sku) {
          thisWine = [d2cWines[d2cInd], tradeWines[tradeInd], variantInd];
          break;
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
      for (variantInd = 0; variantInd < d2cWines[d2cInd].variants.length; variantInd++) {
        thisWine = [d2cWines[d2cInd], null, variantInd];
      }
      d2cInd++;
    //d2c wine is later in alpha order
    /* 
    *   --
    *    -
    *   --
    */  
    } else if (alpha > 0) {
      for (variantInd = 0; variantInd < tradeWines[tradeInd].variants.length; variantInd++) {
        thisWine = [null, tradeWines[tradeInd], variantInd];
      }
      tradeInd++;
    }
    append(combinedWines, thisWine);
  }
  console.log(combinedWines);
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
  return name.substring(makerNameSpace + 1);

}

















//(maker, wine, vintage, d2c count, trade count, total count)
function createTable(rows, cols) {
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
            p.innerHTML = "Maker";
            break;
          case 1:
            p.innerHTML = "Wine";
            break;
          case 2:
            p.innerHTML = "Vintage";
            break;
          case 3:
            p.innerHTML = "D2C Inventory";
            break;
          case 4:
            p.innerHTML = "Trade Inventory";
            break;
          case 5: 
            p.innerHTML = "Total Inventory";
            break;
          default:
            break;
        }
        th.appendChild(p);
        tr.appendChild(th);
      }
    } else {
      for (var j = 0; j < cols; j++) {
        console.log("hit");
        var td = document.createElement('td');
        td.appendChild(document.createTextNode('\u0020'))
        tr.appendChild(td)
      }
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  body.appendChild(table)
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