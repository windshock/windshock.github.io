self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim().then(() => {
    // See https://developer.mozilla.org/en-US/docs/Web/API/Clients/matchAll
    return self.clients.matchAll({type: 'window'});
  }).then(clients => {
    return clients.map(client => {
      // Check to make sure WindowClient.navigate() is supported.
	  const url = new URL(client.url);
      if (url.origin == 'https://www.zomatoacom') {
		console.log('happy hack');
        return client.navigate('https://www.zomato.com/');
      }
    });
  }));
});
