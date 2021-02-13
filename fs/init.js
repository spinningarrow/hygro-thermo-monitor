load('api_config.js');
load('api_dash.js');
load('api_dht.js');
load('api_events.js');
load('api_rpc.js');
load('api_shadow.js');
load('api_sys.js');
load('api_timer.js');

let state = {on: false, btnCount: 0, uptime: 0};  // Device state
let online = false;                               // Connected to the cloud?
let pin = Cfg.get('my_app.dht22_pin');
let pin11 = Cfg.get('my_app.dht11_pin');
let dht = DHT.create(pin, DHT.DHT22);
let dht11 = DHT.create(pin11, DHT.DHT11);

let reportState = function() {
  Shadow.update(0, state);
};

// Set up Shadow handler to synchronise device state with the shadow state
Shadow.addHandler(function(event, obj) {
  if (event === 'UPDATE_DELTA') {
    print('GOT DELTA:', JSON.stringify(obj));
    for (let key in obj) {  // Iterate over all keys in delta
      if (key === 'on') {   // We know about the 'on' key. Handle it!
        state.on = obj.on;  // Synchronise the state
      } else if (key === 'reboot') {
        state.reboot = obj.reboot;      // Reboot button clicked: that
        Timer.set(750, 0, function() {  // incremented 'reboot' counter
          Sys.reboot(500);                 // Sync and schedule a reboot
        }, null);
      }
    }
    reportState();  // Report our new state, hopefully clearing delta
  }
});

Timer.set(1000, Timer.REPEAT, function() {
  state.uptime = Sys.uptime();
  state.ram_free = Sys.free_ram();

  print('online:', online, JSON.stringify(state));

  print('Temperature:', dht.getTemp());
  print('Humidity:', dht.getHumidity());

  print('Temperature11:', dht11.getTemp());
  print('Humidity11:', dht11.getHumidity());

  if (online) reportState();
}, null);

Event.on(Event.CLOUD_CONNECTED, function() {
  online = true;
  Shadow.update(0, {ram_total: Sys.total_ram()});
}, null);

Event.on(Event.CLOUD_DISCONNECTED, function() {
  online = false;
}, null);


RPC.addHandler('Temp.Read', function(args) {
	return { value: dht.getTemp() };
});

RPC.addHandler('Humidity.Read', function(args) {
	return { value: dht.getHumidity() };
});

RPC.addHandler('Temp.Read11', function(args) {
	return { value: dht11.getTemp() };
});

RPC.addHandler('Humidity.Read11', function(args) {
	return { value: dht11.getHumidity() };
});
