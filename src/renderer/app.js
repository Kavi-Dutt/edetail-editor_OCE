const{ipcRenderer, nativeImage,shell} = require('electron')
const path = require('path')
const EventEmitter = require('events');

const createImg = require('./createImg')

let edetailerData = {};
const emitter = new EventEmitter();
const webview = document.querySelector('webview')
;

let sequanceImg_table;
let thumbImgId;


const sequancesDataViewer = document.querySelector('.sequances-data-viewer')

function edetailURLPath(currentSequanceName) {
    return path.join(edetailerData.htmlPath, currentSequanceName, getHtmlFile(currentSequanceName));
}

function sequanceURL(sequanceName){
    return path.join(edetailerData.htmlPath, sequanceName);
}

function removeClass(element,className){
    element.classList.remove(className)
    }
    
getHtmlFile = (sequanceName) => {
    return edetailerData.filesInSequence[sequanceName].filter((html) => html.match(/.*\.(html?)/ig))[0]
}

function openDilog() {
    ipcRenderer.send('open-dialog-trigerd')
    ipcRenderer.invoke('open-dialog').then((result) => console.log(result))
}

function changeWebviewSrc(sequanceName) {
    document.querySelector('webview').src = `file:///${edetailURLPath(sequanceName)}`;
}

function createElement(el, elClass){
    let element = document.createElement(el)
     element.classList.add(elClass)
     return element
 }
function pendingStageBtn(element){
element.classList.add('pending')
}
function successBtn(element){
    element.classList.remove('pending')
    element.classList.add('done')
}
function createDataTable(edetailerData) {
    if (sequancesDataViewer) sequancesDataViewer.innerHTML = ''
    edetailerData.sequences.forEach(slideName => {
        if (slideName) {
            let itemContainer1 = createElement('div','item-container-1')
            let sequancesDataHolder = createElement('div', 'sequances-data_holder')
            sequancesDataHolder.dataset.sequanceId=slideName;

            // thumb image
            let thumbImgContainer = createElement('div','thumb-img-container')
            let thumbImg = createElement('img','thumb-img')
            imgSrc =`${sequanceURL(slideName)}\\01_thumbnail.jpg`
            thumbImg.src= imgSrc


            let sequanceNameContainer = createElement('div','sequance-name_container')
            let sequanceNamePara = createElement('p',null)
            sequanceNamePara.innerText =slideName;
            sequanceNamePara.id= slideName;

            let btnContainer =createElement('div','btn-container')

            // zip btn
            let zipBtn = createElement('button','btn-type-3')
            zipBtn.id= slideName;
            zipBtn.innerText="ZIP";
            zipBtn.dataset.tooltip="create zip file";
            zipBtn.classList.add('zip-btn')
            zipBtn.addEventListener('click', function (e) {
                e.stopPropagation()
                let sequanceId = this.id;
                console.log(sequanceId)
                this.innerText='Zipping...';
                pendingStageBtn(this)
                ipcRenderer.invoke('request-for-compress', sequanceId).then((result) => {
                    this.innerHTML = result;
                    successBtn(this)
                })
            })

            // update thumb image btn
            let thumbImgBtn = createElement('button','btn-type-3');
            thumbImgBtn.id= slideName;
            thumbImgBtn.innerText="Update Thumb Image";
            thumbImgBtn.dataset.tooltip="Update or create Thumb Image";
            thumbImgBtn.classList.add('thumbimg-btn');
            thumbImgBtn.addEventListener('click',function(e){
                e.stopPropagation();
                this.innerText ="Updating..."
                pendingStageBtn(this)
                thumbImgId = this.id;
                console.log(thumbImgId);
                changeWebviewSrc(thumbImgId);
                ipcRenderer.send('request-for-screenshot', edetailURLPath(thumbImgId))
                // reciveing response of request-for-screenshot
                ipcRenderer.on('response-for-screenshot',(e,args)=>{

                    // createing thumb image
                let imgJPEG = createImg.toJPEG(args.screenshot,{imgWidth:328, imgHeight:232})

                

                //    saveing jpeg thumbimage
                    createImg.saveImg({
                        data: imgJPEG,
                        fileName: '01_thumbnail',
                        ext:'jpg',
                        saveToPath: sequanceURL(thumbImgId)
                    })
                    this.innerText ="Done"
                    successBtn(this)
                    // console.log(imgJPEG)
                })

                
            })


            // sequance-img_container <div>
            let sequanceImgContainer = createElement('div','sequance-img_container')

            // sequance-images <div>
            let sequanceImages = createElement('div','sequances-images')
            sequanceImages.innerText=''
            // see images btn
            let  seeImgBtn = createElement('button','btn-type-1')
            seeImgBtn.dataset.sequanceId= slideName;
            seeImgBtn.classList.add('see-images-btn','accordian');
            seeImgBtn.innerText='Images';
            seeImgBtn.addEventListener('click',function(){
                this.classList.toggle('active')
                
                if(sequanceImages.style.maxHeight){
                    sequanceImages.style.maxHeight=null
                }
                else{
                    sequanceImages.style.maxHeight= 300+"px"
                }
                console.log('accordion')
            })



            sequancesDataHolder.append(...[thumbImgContainer,sequanceNameContainer])
            thumbImgContainer.appendChild(thumbImg)

            sequanceNameContainer.append(...[sequanceNamePara,btnContainer])

            btnContainer.append(...[zipBtn,thumbImgBtn,seeImgBtn])

            sequanceImgContainer.append(...[sequanceImages])

            itemContainer1.append(...[sequancesDataHolder,sequanceImgContainer])

            sequancesDataViewer.appendChild(itemContainer1)

            sequancesDataHolder.addEventListener('click', function () {
                var sequanceName = this.dataset.sequanceId;
                
                
                if(!this.classList.contains('active')){
                    changeWebviewSrc(sequanceName);

                     // sending message to main of a click on sequance( here for images)
                    ipcRenderer.send('request-for-sequenceData', sequanceName)

                    document.querySelectorAll('.sequances-data_holder').forEach(el=>el.classList.remove('active'))
                }else{

                }
               

                // reciveing data after request-for-sequence Data event
                ipcRenderer.on('images-from-main',(e,args)=>{
                    let imgsOfSequance = createImgsTable(args,slideName)
                    sequanceImages.appendChild(imgsOfSequance)

                    // adding click functionlity on compress images btn
                    let allCompressImgBtns = document.querySelectorAll('.compress-img-btn')
                    for(i=0; i < allCompressImgBtns.length; i++){
                        let compressImgBtn = allCompressImgBtns[i]
                        compressImgBtn.addEventListener('click',function(e){
                        e.stopPropagation()
                        let btnImgId = this.dataset.imgId
                        ipcRenderer.invoke('compress-img-request',btnImgId).then((result)=>console.log(result))
                        // console.log(btnImgId)
                        })
                    }
                    })

                    this.classList.add('active')
            });

            sequancesDataHolder.addEventListener('dblclick', function () {
                shell.showItemInFolder(sequanceURL(slideName))
                console.log('double click jon seequance holder')
            })

            

            
            
        }
    })

// creating event on creation of table
const sequanceTableCreatedEvent = new Event('sequanceTableCreated');
    console.log(edetailerData);

    document.dispatchEvent(sequanceTableCreatedEvent)


    // sending request for ziping all files
    document.querySelector('.compress-all-btn').addEventListener('click', function () {
        console.log('compress all')
        ipcRenderer.invoke('request-for-compressAll')
    })




}


function createImgsTable(args,sequanceName){
    if(sequanceImg_table) sequanceImg_table.innerHTML=null
     sequanceImg_table = document.createElement('table');

    for( let key in args){
        let imgPath = path.join(sequanceURL(sequanceName),'images',key)
        const row = sequanceImg_table.insertRow()
        let imageNameTd =row.insertCell(0)
        imageNameTd.innerText = key; 
        row.addEventListener('dblclick',()=>shell.openPath(imgPath))
        row.insertCell(1).innerText = args[key];
        row.insertCell(2).innerHTML =  `<button data-img-id = "${key}" class ="compress-img-btn btn-type-3"> compress </button>`
        // console.log(key)
    }

    // sends compress image request to main
    // let allCompressImgBtns = document.querySelectorAll('.compress-img-btn')
    // for(i=0; i < allCompressImgBtns.length; i++){
    //     let compressImgBtn = allCompressImgBtns[i]
    //     compressImgBtn.addEventListener('click',function(){
    //     let btnImgId = this.dataset.imgId
    //     ipcRenderer.invoke('compress-img-request',btnImgId).then((result)=>console.log(result))
    //     console.log(btnImgId)
    //     })
    // }
    
    return sequanceImg_table
}




// sending ipc message on click of add project btn
document.querySelector('#add-project_btn').addEventListener('click', openDilog)



ipcRenderer.on('data-from-main', (e, args) => {
    edetailerData = args
    createDataTable(edetailerData)
    document.querySelector('webview').src = `file:///${edetailURLPath(edetailerData.sequences[0])}`

})


// reciveing data after request-for-sequenceDaata event
// ipcRenderer.on('images-from-main',(e,args)=>{
//     createImgsTable(args)
// })


// // reciveing response of request-for-screenshot
// ipcRenderer.on('response-for-screenshot',(e,args)=>{

//     // createing thumb image
//    let imgJPEG = createImg.toJPEG(args.screenshot,{imgWidth:328, imgHeight:232})

 

// //    saveing jpeg thumbimage
//     createImg.saveImg({
//         data: imgJPEG,
//         fileName: '01_thumbnail',
//         ext:'jpg',
//         saveToPath: sequanceURL(thumbImgId)
//     })
    
//  thumbImgBtn.querySelectorAll()
//     // console.log(imgJPEG)
// })


// context menu for sequance data holder


document.addEventListener('sequanceTableCreated',function(){
    let sequancesDataHolder =document.querySelectorAll('.sequances-data_holder')
    
    sequancesDataHolder.forEach(el=>{
        let sequanceId = el.dataset.sequanceId;
        let sequancePath = sequanceURL(sequanceId)
        el.addEventListener('contextmenu',function(e){
            ipcRenderer.send('sequancesDataHolder/contextmenu',sequancePath)
            console.log(sequancePath)
        })
    })
    
    console.log('custom event trigered')
})


