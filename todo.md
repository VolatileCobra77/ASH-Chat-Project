# to do
## general
- [ ] give each message an individual id
- [ ] add the ability to "pin" messages (?)


giving messages ids might be helpful for things such as deleting or replying to messages.

pinning messages would make it so the message doesn't disapear upon reloading or clearing the screen

moderation?
## copying
- [x] display the icon
- [x] make it actually copy things
## channels
- [x] !channel join `(channel:string)`
- [ ] !channel invite `(email:string)` `(channel:string)`, !channel remove `(email:string)` `(channel:string)`
- [x] !channel create `(name:string)` `(type:string)`
- [x] show active channel in `<title>` or somewhere else
- [x] finish making channels actually work, add writing to all of the functions. Solve wsConnection.ws.send() not being a function
- [x] add error handling for channel id being null when authenticating 


create will accept either private or public as a type and return an error if it gets not one of those. it will default to public if it gets none. 
## themes
- [x] dark theme (ew)
- [x] neon theme ?!?!?!

perhaps we could give ids to custom themes. it can really be as simple as combining the hex codes of the custom theme. this might be useful for sharing themes

## Domain
- [x] Migrate to my domain
- [x] Put on its own subdomain
- [x] Make websocket connections work (See [notes.md](notes.md))