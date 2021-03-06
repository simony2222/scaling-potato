function changeThings(usersName, language, nbMonths) {
  /*To update with the value that we get from the input*/

  /*  FIRST REQUEST, TO GET THE USERS MAIN INFO*/

  var url = "https://" + language + ".wikipedia.org/w/api.php";
  var params = {
    action: "query",
    list: "users",
    ususers: usersName,
    usprop: "blockinfo|groups|editcount|registration|emailable|gender",
    format: "json",
  };

  url = url + "?origin=*";
  Object.keys(params).forEach(function (key) {
    url += "&" + key + "=" + params[key];
  });
  fetch(url)
    .then(function (response) {
      return response.json();
    })
    .then(function (response) {
      /*Define all the variables usefull to show after*/
      console.log(response);
      var users = response.query.users;
      var xname = users[0].name;
      var xblockinfo = users[0].blockinfo;
      var xgroups = users[0].groups;
      var xeditcount = users[0].editcount;
      var xregistration = users[0].registration;
      var xemailable = users[0].emailable;
      var xgender = users[0].gender;
      /*Show the different value*/
      console.log(xname);
      document.getElementById("name").innerHTML = xname;
      /*document.getElementById("blockinfo").innerHTML =+xblockinfo;*/
      document.getElementById("groups").innerHTML = xgroups;
      document.getElementById("editcount").innerHTML = xeditcount;
      document.getElementById("registration").innerHTML = xregistration;
      document.getElementById("emailable").innerHTML = xemailable;
    });

  /*Second request to get the different queries of that user*/
  /* SECOND REQUEST, TO GET THE USERS CONTRIBUTIONS*/

  var listURLuserQueries = [];
  timestampEx = "2021-03-07T14:56:00Z";
  var numberMonths = nbMonths; /* Nombre de mois donné par l'utilisateur*/
  var lTimeStamp = createTimestemps(timestampEx, numberMonths + 1);
  listURLuserQueries = createURLdifferentTime(
    lTimeStamp,
    language,
    usersName,
    numberMonths - 1
  ); /* We split the request by months*/

  Promise.all(
    listURLuserQueries.map((url) => fetch(url).then((resp) => resp.json()))
  ).then((resp) => {
    //document.getElementById("tab").innerHTML = "<div class='row'><button type='button' class ='btn btn-success mb-2' onclick= "+'" displayValue(innerTab);"'+">Display all the last queries of the users </button> </div>";
    //document.getElementById("tab").innerHTML += "<div class='row' > <div class='col-2 bg-primary' > <strong>Page</strong> </div> <div class='col-2 bg-primary' > <strong>Jour de l'édit </strong> </div> <div class='col-1 bg-primary' ><strong> DeltaSize </strong> </div> <div class='col-7 bg-primary' > <strong>Categories</strong>  </div></div>";
    document.getElementById("tab_box").hidden = false;

    var usercontribs = {};
    var NumberQueries = 0;
    var Partition = [];
    var V = [];
    var countInter = 0;
    var plateau = [];
    var usersC = [];
    var number = 0;
    var actionByMonths = [];
    var data = {};
    var actionByMonths2 = [];
    var correspondanceNameEditDiff = {};
    var correspondanceNameOne = {};

    /* In this part I group and divide the different pages in blocks to be send to the server. 
        Each of them have to be of a size < 50 to be accepted. */

    for (i = 0; i < numberMonths; i++) {
      K = resp[i].query.usercontribs;
      usercontribs[i] = K;
      var temp = {};

      actionByMonths.push([lTimeStamp[i].substring(0, 10), K.length]);
      actionByMonths2.push(K.length);
      for (var u in K) {
        usersC[number] = K[u];
        number += 1;
        correspondanceNameOne[K[u].title] = 1;
        correspondanceNameEditDiff[K[u].title] = Math.round(
          Math.abs(K[u].sizediff)
        );
      }

      if (K.length > 50) {
        Partition.push(V);
        V = new Array();
        plateau.push(NumberQueries);
        var repeat = Math.floor(K.length / 50);

        for (j = 0; j < repeat; j++) {
          V.push(i);
          Partition.push(V);
          V = new Array();
          NumberQueries += 50;
          plateau.push(NumberQueries);
        }
        V.push(i);
        Partition.push(V);
        V = new Array();
        NumberQueries += K.length - 50 * (repeat - 1);
        plateau.push(NumberQueries);
        countInter = 0;
      } else {
        NumberQueries += K.length;
        countInter = countInter + K.length;
        if (countInter > 50) {
          countInter = K.length;
          Partition.push(V);
          V = [];
          plateau.push(NumberQueries);
        }
        V.push(i);
      }
    }

    Partition.push(V);
    plateau.push(NumberQueries);
    var separation = Partition.length;

    /* NOT REALLY RELATED BUT … */
    /* -> DRAW GRAPH*/

    var chart = anychart.column();
    chart.title("Evolution of the quantity of modification made by the users");
    chart.xAxis().title("Months");
    chart.yAxis().title("Nomber of modification");
    var series = chart.column(actionByMonths);
    chart.container("container");
    chart.draw();

    // show the graph
    document.getElementById("container").hidden = false;

    /* -> SORT usersC */
    var usersC = usersC.sort(function (a, b) {
      /*We sort the contribution by the absolute value of delta size. */ if (
        Math.abs(a.sizediff) < Math.abs(b.sizediff)
      ) {
        return 1;
      }
      if (Math.abs(a.sizediff) > Math.abs(b.sizediff)) {
        return -1;
      }
      return 0;
    });

    /* Now we desgin the url to get the categories associated.*/

    listURLCategories = [];
    var borne = 0;
    for (var e in Partition) {
      if (Partition[e - 1] == Partition[e]) {
        borne += 1;
      } else {
        borne = 0;
      }
      var title = createTitles(
        usercontribs,
        Partition[e],
        borne * 50
      ); /* Each Url will get a different "Title", wich is the titles of the different pages we saerch. There are at most 50 pages in the block.*/
      var Url = createURLCategories(title, language);
      listURLCategories.push(Url);
    }

    Promise.all(
      listURLCategories.map((url /* We fetch all the url */) =>
        fetch(url).then((resp2) => resp2.json())
      )
    ).then((resp2) => {
      /* NOW HAVE ALL THE CATEGORIES CORRESPONDING TO THE PAGE THE USERS CONTRIBUTES TO. 
            BUT WE HAVE TO ADAPT TO THE SERVER AND TO SEND HIM ID OF THE CATEGORIES, THAT WE DON'T HAVE YET.

            -> FOURTH QUERIES */

      var L = {};
      var pageViews = [];
      var links = [];
      var linkshere = [];
      var group = {};
      var jsonServeur = [];
      var jsonServeur2 = [];
      var jsonServeur3 = [];
      var correspondance = [];
      var correspondanceCategoriesPage = {};

      for (var i = 0; i < separation; i++) {
        /* For each fetchs… there is 10 fetchs*/
        var pages = resp2[i].query.pages;
        for (var p in pages) {
          let categ =
            ""; /*Variable that will contains all the categories of these page*/
          try {
            for (var cat of pages[p].categories) {
              var index = cat.title.indexOf(":");
              var mot = cat.title.substring(index + 1, cat.title.length);
              categ += mot + " </br>"; /* We add the categories*/
              correspondance.push(cat.title);
              correspondanceCategoriesPage[cat.title] = pages[p].title;
            }
            L[pages[p].title] = categ;
          } catch (TypeError) {
            categ = "";
          }
          try {
            status;
            key = Object.keys(pages[p].pageviews);
            LpageV = pages[p].pageviews;
            var A = getAverage(LpageV, key);
            pageViews.push([p, pages[p].title, A]);
            links.push([pages[p].title, pages[p].links]);
            linkshere.push([pages[p].title, pages[p].linkshere]);
          } catch (TypeError) {
            var doNothing = 0;
          }
        }
      }

      /*FOURTH CALL TO GET THE ID OF THE CATEGORIES */
      URLindexListe = getURLindexpage(language, correspondance);

      Promise.all(
        URLindexListe.map((url /* We fetch all the url */) =>
          fetch(url).then((resp3) => resp3.json())
        )
      ).then((resp3) => {
        correspondanceIdNom = {};
        var blockCategories = [];

        for (var u in resp3) {
          page = resp3[u].query.pages;
          for (var i in page) {
            correspondanceIdNom[page[i].title] = page[i].pageid;
            blockCategories.push(page[i].pageid);
            jsonServeur2.push({
              categories: [page[i].pageid],
              weight:
                correspondanceNameEditDiff[
                  correspondanceCategoriesPage[page[i].title]
                ],
            });
            jsonServeur3.push({
              categories: [page[i].pageid],
              weight:
                correspondanceNameOne[
                  correspondanceCategoriesPage[page[i].title]
                ],
            });
          }
        }

        group["categories"] = blockCategories;
        group["weight"] = 1; /* By default. For now*/
        jsonServeur.push(group);

        /* WE HAVE CREATED 3 QUERIES TO THE SERVER, WE WILL DO THEM ONE AFTER THE OTHER*/

        /* WE CALL THE SERVER AND GET THE RESPONSE */

        // ====================================================== //
        // ======================== Limit ======================= //
        // ====================================================== //

        /*-> Premier appel */
        var limit = 10;
        console.log(DOMAIN);
        var xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          DOMAIN + "/api/" + language + "/category?limit=" + limit,
          true
        );

        //Envoie les informations du header adaptées avec la requête
        xhr.setRequestHeader("Content-Type", "application/json");
        var jsonResponse1;
        xhr.send(JSON.stringify(jsonServeur));
        xhr.onreadystatechange = function () {
          //Appelle une fonction au changement d'état.
          if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            jsonResponse1 = JSON.parse(this.responseText);

            /*-> Deuxieme appel */

            var xhr = new XMLHttpRequest();
            xhr.open(
              "POST",
              DOMAIN + "/api/" + language + "/category?",
              true
            );
            //Envoie les informations du header adaptées avec la requête
            xhr.setRequestHeader("Content-Type", "application/json");
            var jsonResponse2;
            xhr.send(JSON.stringify(jsonServeur2));
            xhr.onreadystatechange = function () {
              //Appelle une fonction au changement d'état.
              if (
                this.readyState === XMLHttpRequest.DONE &&
                this.status === 200
              ) {
                jsonResponse2 = JSON.parse(this.responseText);

                /*-> Troisieme appel */

                var xhr = new XMLHttpRequest();
                xhr.open(
                  "POST",
                  DOMAIN + "/api/" +
                    language +
                    "/category?limit=" +
                    limit,
                  true
                );
                //Envoie les informations du header adaptées avec la requête
                xhr.setRequestHeader("Content-Type", "application/json");
                var jsonResponse3;
                xhr.send(JSON.stringify(jsonServeur3));
                xhr.onreadystatechange = function () {
                  //Appelle une fonction au changement d'état.
                  if (
                    this.readyState === XMLHttpRequest.DONE &&
                    this.status === 200
                  ) {
                    jsonResponse3 = JSON.parse(this.responseText);
                    idPAGEresponse = [];

                    /*FOR EACH ONE OF THE ELEMENT RESPONSE1 AND RESPONCE 3, I WILL FIND THE WEIGHT IN RESPONSE2*/

                    var correspondanceIdPoid1 = {};
                    var correspondanceIdPoid2 = {};
                    for (var i = 0; i < limit; i++) {
                      var id1 = jsonResponse1[i].category.id;
                      var id2 = jsonResponse3[i].category.id;
                      for (var u in jsonResponse2) {
                        if (jsonResponse2[u].category.id == id1) {
                          correspondanceIdPoid1[id1] = jsonResponse2[u].weight;
                        }
                        if (jsonResponse2[u].category.id == id2) {
                          correspondanceIdPoid2[id2] = jsonResponse2[u].weight;
                        }
                      }
                    }

                    correspondanceIdPoid = [
                      correspondanceIdPoid1,
                      correspondanceIdPoid2,
                    ];

                    /*    -------------------------------------------------- */
                    /*WE NOW DO THE LAST CALL TO THE WIKIPEDIA SERVER TO GET THE NAME OF THE IDS THAT THE SIMON'S SERVER SEND US*/

                    var idsW = "";
                    for (i = 0; i < limit; i++) {
                      idPAGEresponse.push(jsonResponse1[i].category.id);
                      idsW += "|" + jsonResponse1[i].category.id;
                    }
                    idsW = idsW.substring(1, idsW.length);
                    var url =
                      "https://" + language + ".wikipedia.org/w/api.php";
                    var params = {
                      action: "query",
                      format: "json",
                      prop: "info",
                      pageids: idsW,
                    };
                    url = url + "?origin=*";
                    Object.keys(params).forEach(function (key) {
                      url += "&" + key + "=" + params[key];
                    }); /*Constructing the url*/

                    var idsW2 = "";
                    for (i = 0; i < limit; i++) {
                      idPAGEresponse.push(jsonResponse3[i].category.id);
                      idsW2 += "|" + jsonResponse3[i].category.id;
                    }
                    idsW2 = idsW2.substring(1, idsW2.length);
                    var url2 =
                      "https://" + language + ".wikipedia.org/w/api.php";
                    var params = {
                      action: "query",
                      format: "json",
                      prop: "info",
                      pageids: idsW2,
                    };
                    url2 = url2 + "?origin=*";
                    Object.keys(params).forEach(function (key) {
                      url2 += "&" + key + "=" + params[key];
                    }); /*Constructing the url*/

                    Promise.all([
                      /*LAST CALL*/
                      fetch(url).then((resp) => resp.json()),
                      fetch(url2).then((resp) => resp.json()),
                    ]).then(function (response) {
                      Cat = [[], []];
                      var correspondanceNameWeightFinal = [{}, {}];
                      // [correspondance for 0, correspondance for 1]

                      for (var i = 0; i < 2; i++) {
                        for (var u in response[i].query.pages) {
                          Cat[i].push(response[i].query.pages[u].title);
                          correspondanceNameWeightFinal[i][
                            response[i].query.pages[u].title
                          ] =
                            correspondanceIdPoid[i][
                              response[i].query.pages[u].pageid
                            ];
                        }
                      }

                      /*HERE correspondanceNameWeightFinal HAVE THE TITLE, AND THE NUMBER ASSOCIATED THE WEIGHT THAT WE GET WITH 2.*/

                      /*SOME STUFF TO DO, TO BE DRAW AND DISPLAY.*/

                      var sortedpageViews = pageViews.sort(function (a, b) {
                        /*We sort the contribution by the absolute value of delta size. */
                        if (a[2] < b[2]) {
                          return 1;
                        }
                        if (b[2] < a[2]) {
                          return -1;
                        }
                        return 0;
                      });

                      /* generate_main_categories_panel(
                        correspondanceNameWeightFinal,
                        Cat,
                        limit
                      ); */

                      var pie = [
                        Object.keys(correspondanceNameWeightFinal[0]).map(
                          (c) => ({
                            x: c.split(/:(.+)/)[1],
                            value: correspondanceNameWeightFinal[0][c],
                          })
                        ),
                        Object.keys(correspondanceNameWeightFinal[1]).map(
                          (c) => ({
                            x: c.split(/:(.+)/)[1],
                            value: correspondanceNameWeightFinal[1][c],
                          })
                        ),
                        //Object.keys(correspondanceNameWeightFinal[1]).map(c =>{"x": c, "value": weicorrespondanceNameWeightFinalghts[1][c]})
                      ];

                      make_graph(pie[0], "make_graph_0", "Number of contributions");
                      make_graph(pie[1], "make_graph_1", "Size of contributions");

                      // last table
                      createRows(usersC, L, language, plateau);
                      document.getElementById("displayInfo0").hidden = false;
                      document.getElementById("displayInfo1").hidden = false;

                      /*  L1 = sortedpageViews.slice(0, 5);
                      L2 = sortedpageViews.slice(6, 10);
                      L3 = sortedpageViews.slice(11, 15);
                      LCat = [L1, L2, L3, L1, L2, L3, L1];

                      nbMainCat = limit; 

                   

                      createBlock(nbMainCat, Cat);
                      for (y = 0; y < nbMainCat; y++) {
                        fillPage(
                          usersC,
                          language,
                          L,
                          10,
                          LCat[y],
                          y,
                          nbMainCat
                        );
                      } */
                    });
                  }
                };
              }
            };
          }
        };
      });
    });
  });
}

function hide_show_categories() {
  self = document.getElementById("category_tab_switcher");
  tab = document.getElementById("innerTab");
  if (tab.hidden) {
    self.innerHTML = "˄˄ Hide all the last edits of the user ˄˄";
  } else {
    self.innerHTML = "˅˅ Show all the last edits ˅˅";
  }
  tab.hidden = !tab.hidden;
}

/* function generate_main_categories_panel(weights, categories, limit_old) {
  // Object.keys(dictionary).length
  var limit = Math.min(
    limit_old,
    Object.keys(weights[0]).length,
    Object.keys(weights[1]).length,
    Object.keys(categories[0]).length,
    Object.keys(categories[1]).length
  );

  // 0 -> page rank
  // 1 -> n rank
    var pie = [
      Object.keys(weights[0]).map(c => {"x": c, "value": weights[0][c]}),
      Object.keys(weights[1]).map(c =>{"x": c, "value": weights[1][c]})
    ];

  document.getElementById("displayInfo").innerHTML = 
    `${generate_blocks(categories_0, weights_0, limit, "category_line_0")}
    ${generate_blocks(categories_1, weights_1, limit, "category_line_1")}`;

    document.getElementById("displayInfo").hidden=false;


    function make_pie(data, id){
      anychart.onDocumentReady(function () {
        // create pie chart with passed data
        var chart = anychart.pie(data);
  
        // set chart title text settings
        chart
          // set chart radius
          .radius('43%');
  
        // set container id for the chart
        chart.container('container');
        // initiate chart drawing
        chart.draw();
      });
    }

    


  
  
  function generate_blocks(categories, weight, n, id){
    console.log(weight)
    var max = Math.max(...weight);
    console.log(max)
    var ret =`
    <div 
      id=${id}
      class="imp_cat_main_block"
      style="height:50%;"
      >`;
    for(var i=0; i<n; i++){
      var height = weight[i]/max*90;
      console.log(height)
      var biso = "";
      if(i==0){
        biso="border-radius: 0px 0px 6px 0px;"
      } else if(i==n) {
        biso="border-radius: 0px 0px 0px 6px;"
      }
      ret +=
        `<div style="width: ${1/n*100}%; display: inline-block;">
          <div class="left_${id}$ style="background-color:green; height: ${100-height}%;"> &nbsp; </div>
          <div 
          style="height: ${height}%; ${biso} background-color:green; overflow: visible;">
          <p style="margin:0px;">${categories[i].split(/:(.+)/)[1]}</p>
          </div>
        </div>`
    }

    ret+="</div>";
    return ret;
  }

} */

function make_graph(data, id, title) {
  var chart = anychart.tagCloud(data);

  chart.title(title)

  // set the container id
  chart.container(id);

  // initiate drawing the chart
  chart.draw();
}
