<?php $state = isset($_GET['state']) ? $_GET['state'] : "NY"; ?>
<!DOCTYPE html>
<head>
<meta charset="utf-8" />
<link href='https://fonts.googleapis.com/css?family=Open+Sans:400,700,800,300' rel='stylesheet' type='text/css'>
<link href='./css/c3.min.css' rel='stylesheet' type='text/css'>
<link href='./css/dashboard.css' rel='stylesheet' type='text/css'>
<script>
  function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  function selectState() {
    var newState = document.getElementById("states").value
    window.location.href = window.location.pathname + "?state=" + newState
  }

  function setState() {
    console.log('here');
    var state = getParameterByName('state')
    document.getElementById("states").value=state
  }
</script>
</head>
<body onload="setState()">
<header>
  <div id='logo'>
    <img src='./logo.png'>
    <span>Event Analytics</span>
    <select id='states' onchange="selectState()">
      <option value='all'>All States</option>
      <option value="AL">Alabama</option>
      <option value="AK">Alaska</option>
      <option value="AZ">Arizona</option>
      <option value="AR">Arkansas</option>
      <option value="CA">California</option>
      <option value="CO">Colorado</option>
      <option value="CT">Connecticut</option>
      <option value="DE">Delaware</option>
      <option value="DC">District Of Columbia</option>
      <option value="FL">Florida</option>
      <option value="GA">Georgia</option>
      <option value="HI">Hawaii</option>
      <option value="ID">Idaho</option>
      <option value="IL">Illinois</option>
      <option value="IN">Indiana</option>
      <option value="IA">Iowa</option>
      <option value="KS">Kansas</option>
      <option value="KY">Kentucky</option>
      <option value="LA">Louisiana</option>
      <option value="ME">Maine</option>
      <option value="MD">Maryland</option>
      <option value="MA">Massachusetts</option>
      <option value="MI">Michigan</option>
      <option value="MN">Minnesota</option>
      <option value="MS">Mississippi</option>
      <option value="MO">Missouri</option>
      <option value="MT">Montana</option>
      <option value="NE">Nebraska</option>
      <option value="NV">Nevada</option>
      <option value="NH">New Hampshire</option>
      <option value="NJ">New Jersey</option>
      <option value="NM">New Mexico</option>
      <option value="NY">New York</option>
      <option value="NC">North Carolina</option>
      <option value="ND">North Dakota</option>
      <option value="OH">Ohio</option>
      <option value="OK">Oklahoma</option>
      <option value="OR">Oregon</option>
      <option value="PA">Pennsylvania</option>
      <option value="RI">Rhode Island</option>
      <option value="SC">South Carolina</option>
      <option value="SD">South Dakota</option>
      <option value="TN">Tennessee</option>
      <option value="TX">Texas</option>
      <option value="UT">Utah</option>
      <option value="VT">Vermont</option>
      <option value="VA">Virginia</option>
      <option value="WA">Washington</option>
      <option value="WV">West Virginia</option>
      <option value="WI">Wisconsin</option>
      <option value="WY">Wyoming</option>
    </select>
  </div>


</header>
<section id='filters'>
  <h1>Global Filters</h1>
  <sub>Changes data composition of the whole event analytics</sub>
  <form id='global-filters'>
    <div class='filter-item region-filter'>
      <h4>Region Filters <span class='filter-counter'></span></h4>
      <div class='filter-item-container' id='region-filter-list'>
        <ul></ul>
      </div>
    </div>

    <div class='filter-item type-filter'>
      <h4>Filter Event Type <span class='filter-counter'></span></h4>
      <div class='filter-item-container' id='type-filter-list'>
        <ul></ul>
      </div>
    </div>
  </form>

</section>

<section id='charts'>
  <div id='loader'>Loading Data...</div>
  <h1>Event Analytics - <?php echo $state; ?></h1>

  <div class='chart-group first-child'>
    <h2>Event Count</h2>
    <h4>Events By Region</h4>
    <div id='by-region'></div>
    <h4>Events By Type</h4>
    <div id='by-type'></div>
  </div>

  <div class='chart-group'>
    <h2>RSVPs</h2>
    <h4>RSVP By Region</h4>
    <div id='rsvp-by-region'></div>
    <h4>RSVP By Type</h4>
    <div id='rsvp-by-type'></div>
  </div>

  <div class='chart-group'>
    <h2>Growth</h2>
    <h4>Accumulative Growth of Events </h4>
    <div class='overall-growth event-region'>
      <ul>
      </ul>
    </div>

    <h4>Accumulative Growth of RSVP </h4>
    <div id='growth-by-region' class='overall-growth rsvp-region'>
      <ul>
      </ul>
    </div>

  </div>

</section>

<script src="./js/c3.min.js" type='text/javascript'></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.6/d3.min.js" charset="utf-8" type='text/javascript'></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.0.0-alpha1/jquery.min.js"></script>
<script src='./js/deparam.min.js'></script>

<script type='text/javascript'>
  window.global_state = '<?php echo $state; ?>';
</script>
<script src='./js/dashboard.js' type='text/javascript'></script>
</body>
