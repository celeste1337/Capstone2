import React, { useEffect, useState, useRef } from 'react';
import { withCookies, useCookies } from 'react-cookie';

import {create} from '@lottiefiles/lottie-interactivity';
import {Link, Navigate} from 'react-router-dom';
import {config} from '../../utilities/constants';
import { useFirstRender } from './FirstRenderHook';
import './CombinationPage.css';
import first from './lotties/first.json';
import second from './lotties/second.json'
import { Player } from '@lottiefiles/react-lottie-player';

//why does it do this.
const mergeImages = require('merge-base64');

function CombinationPage(props) {
    //were using react hooks just for fun/to learn about them here
    const [cookies, setCookie, removeCookie] = useCookies(['creatureId']);
    const [imagesIds, setImagesIds] = useState({
        images: [],
        ids: [],
    })
    const [imageArray, updateImageArray] = useState([]);
    const [idArray, setIdArray] = useState([]);
    const [finalImg, setFinalImg] = useState("");
    const [finalCode, setFinalCode] = useState("");
    const [bodyCode, setBodyCode] = useState("");
    const [borderColor, setBorderColor] = useState("");
    const [currentAnimation, setCurrentAnimation] = useState(first);
    const [animationFinished, setAnimationFinished] = useState(false);
    const firstRender = useFirstRender();
    const controller = new AbortController();
    const signal = controller.signal;
    const player = useRef(null);

    //on init
    useEffect(() => {
        //this runs every time imageArray is changed
        //imageArray gets changed when we have all the images
        if(!finalImg) {
            //finalimg here is the src attribute of the final image
            mergeThem();
        }

        //cleanup :DDDDD
        return () => {
            controller.abort();
        }
    }, 
    //empty array here indicates what props to reload on
    [imagesIds, player])
    
    const determineTypesLeft = (type) => ["Head", "Body", "Legs"].filter(item => type !== item);
    
    const getType = (creatureObj) => creatureObj.type;
    
    const removeCookieOnDone = () => removeCookie('creatureId');

    const getImageByID = async (creatureId) => {
        let img = await fetch(config.url.API_URL + '/getPart/' + creatureId, {signal});
        return img.json();
    };

    const getImageRandomType = async (type) => {
        let img = await fetch(config.url.API_URL + '/getRandomPart/' + type, {signal});
        return img.json();
    };

    const mergeThem = () => {
        if(imagesIds.images && imagesIds.images.length > 0) {
            mergeImages(imagesIds.images, {
                //options
                //make it vertical
                direction:true,
                color: '#ffffff',
            }).then((img)=> {
                setFinalImg(img);
                //save to db :D
                saveFinalImage(img);
            })
        }
    }

    const fetchImages = async () => {
        //need to get initial creatureid via cookie
        let tempArr = [];
        let base64Images = [];
        let idArr = [];

        //note the double awaits. there are a lot of promises going on
        //even tho the awaits are blocking it we kinda want them to
        //bc we need to get the first image (the one the user drew) before we get the others
        //bc we use initimg to determine other types

        let initImg = await getImageByID(cookies.creatureId);
        setBodyCode(cookies.creatureId);

        const otherTypes = determineTypesLeft(getType(initImg));
        let otherparts = otherTypes.map(type => getImageRandomType(type))
        Promise.all(otherparts).then(vals => {
            tempArr = tempArr.concat(initImg, vals).flat()

            tempArr.forEach((creature) => {
                //this kinda doesnt matter as long as it has a value -> itll rewrite itself but thats whatevs
                setBorderColor(creature.data.borderColor);

                const setMe = (input) => input.replace("data:image/png;base64,","")

                switch (getType(creature)) {
                    case 'Head':
                        base64Images[0] = setMe(creature.data.imageData);
                        idArr[0] = creature.creatureid;
                        break;
                    case 'Body':
                        base64Images[1] = setMe(creature.data.imageData);
                        idArr[1] = creature.creatureid;
                        break;
                    case 'Legs':
                        base64Images[2] = setMe(creature.data.imageData);
                        idArr[2] = creature.creatureid;
                        break;
                    default:
                        break;
                }
            });
            setImagesIds({...imagesIds, images: base64Images, ids: idArr})
        })
    }

    const saveFinalImage = (img) => {
        //start building data obj to send to the db :)
        if(imagesIds.ids.length === 3) {
            let finalBase64 = img;
            let finalCharCode = `${imagesIds.ids[0]}-${imagesIds.ids[1]}-${imagesIds.ids[2]}`;

            setFinalCode(finalCharCode);

            let dataObj = {
                creatureid: finalCharCode,
                creatures: imagesIds.ids,
                data: {
                    imageData: finalBase64,
                    borderColor: borderColor
                },
                createdOn: Date.now(),
            }

            fetch(config.url.API_URL + '/saveCreature', {
                method: 'POST',
                body: JSON.stringify(dataObj),
                headers: {
                    'Content-type':'application/json'
                }
            });
        }
    }

    const checkCookies = (obj) => Object.keys(obj).length !== 0; //if cookie return true

    if(!checkCookies(cookies)) {
        //see if they have the cookie w their creature id
        //if no cookies, redir to home
        console.log('no cookies?')
        return (<Navigate to="/"></Navigate>)
    }

    if(firstRender) {
        fetchImages();
    }
    
    return(
        <div className="combinationPageWrapper">
            <div className="comboPage">
                {!animationFinished && 
                <Player
                    autoplay={true}
                    loop={false}
                    src={currentAnimation}></Player>
                }
                {animationFinished && 
                <div id="completed">
                    <img id="finalImg" src={finalImg}></img>
                    <div id="codes">
                        <div className="creatureCodeBox">
                            <h3>Your creature code is</h3>
                            <h2 className="code">{finalCode}</h2>
                            <h4>Check in with a CreatureLab scientist to finish your creature.</h4>
                        </div>
                        <div className="bodyPartCodeBox">
                            <h3>Your body part code is</h3>
                            <p className="code">{bodyCode}</p>
                        </div>

                        <Link to="/home" onClick={removeCookieOnDone}>Done</Link>
                    </div>
                
                </div>
                }
            </div>
        </div>
    );
}

export default withCookies(CombinationPage);