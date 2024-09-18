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
- [ ] !channel join `(channel:string)`
- [ ] !channel invite `(email:string)` `(channel:string)`
- [ ] !channel create `(name:string)` `(type:string)`
- [ ] show active channel in `<title>` or somewhere else

create will accept either private or public as a type and return an error if it gets not one of those. it will default to public if it gets none. 
## themes
- [ ] dark theme (ew)
- [ ] neon theme ?!?!?!

perhaps we could give ids to custom themes. it can really be as simple as combining the hex codes of the custom theme. this might be useful for sharing themes?