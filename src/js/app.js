const CandidateListPic = {
  0: "../images/nd.jpg",
  1: "../images/bc.jpeg",
  2: "../images/rp.jpg",
  3: "../images/vb.jpeg"
};

App = {
  web3Provider: null,
  contracts: {},
  account: undefined,
  hasVoted: false,
  res: [],
  init: function() {
    return App.initWeb3();
  },

  initWeb3: function() {
    // TODO: refactor conditional
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: function() {
    $.getJSON("Election.json", function(election) {
      // Instantiate a new truffle contract from the artifact
      App.contracts.Election = TruffleContract(election);
      // Connect provider to interact with contract
      App.contracts.Election.setProvider(App.web3Provider);

      App.listenForEvents();

      return App.render();
    });
  },

  // Listen for events emitted from the contract
  listenForEvents: function() {
    App.contracts.Election.deployed().then(function(instance) {
      // Restart Chrome if you are unable to receive this event
      // This is a known issue with Metamask
      // https://github.com/MetaMask/metamask-extension/issues/2393
      instance.votedEvent({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function(error, event) {
        console.log("event triggered", event)
        // Reload when a new vote is recorded
        App.render();
      });
    });
  },

  render: function() {
    var electionInstance;
    var loader = $("#loader");
    var content = $("#content");
    const isVoted = $("#isVoted");

    loader.show();
    content.hide();
    isVoted.hide();

    // Load account data
    if(web3.currentProvider.enable){
    //For metamask
      web3.currentProvider.enable().then(function(acc){
          App.account = acc[0];
          $("#accountAddress").html("Your Account: " + App.account);
      })
    } else{
        App.account = web3.eth.accounts[0];
        $("#accountAddress").html("Your Account: " + App.account);
    }

    // Load contract data
    App.contracts.Election.deployed().then(function(instance) {
      electionInstance = instance;
      return electionInstance.candidatesCount();
    }).then(function(candidatesCount) {
      

      var candidatesSelect = $('#candidatesSelect');
      candidatesSelect.empty();

      App.res = [];

      for (var i = 1; i <= candidatesCount; i++) {
        electionInstance.candidates(i).then(function(candidate) {
          var id = candidate[0];
          var name = candidate[1];
          var voteCount = candidate[2];
          App.res.push({id: Number(id),name,voteCount: Number(voteCount)})
          // Render candidate Result
        });
      }
      return electionInstance.voters(App.account);
    }).then(function(hasVoted) {
      // Do not allow a user to vote
      if(hasVoted) {
        $('form').hide();
        isVoted.show();
      } 
      loader.hide();
      content.show();
      App.renderIfHome(hasVoted);
    }).catch(function(error) {
      console.error(error);
    });
  },
  renderIfHome:function(hasVoted) {
    var candidatesContainer= $("#candidateData");
    const data = App.res.splice(0,4);
    let candidates = data.map((item, index) => {
      let button = `<button id='voteButton' onclick='return App.castVote(${index +1})'>Vote</button>`;
      let content = '<div style="display: flex; align-items: center; margin-bottom: 20px;" >' +`<div id="image"><img src=${CandidateListPic[index]} alt=${index} /></div> <div id="canName">${item.name}</div>`;
      let end = "</div>";
      return hasVoted ? content + end : content + button + end;
    });
    candidatesContainer.html(candidates);
      var candidatesResults = $("#candidatesResults");
      let TData;
     data.map((item) => {
       TData += "<tr><th>" + Number(item.id) + "</th><td>" + item.name + "</td><td>" + item.voteCount + "</td></tr>";
    });    
    candidatesResults.empty()
    candidatesResults.append(TData)
  }
  ,
  castVote: function(id) {
    var candidateId = id;    
    App.contracts.Election.deployed().then(function(instance) {
      return instance.vote(candidateId, { from: App.account });
    }).then(function(result) {
      // Wait for votes to update
      $("#content").hide();
      $("#loader").show();
    }).catch(function(err) {
      console.error(err);
    });
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
