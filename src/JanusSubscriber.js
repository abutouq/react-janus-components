import React, { useRef, useState, useEffect } from 'react';
import $ from 'jquery';
import Janus from './utils/janus';
import { publishToRoom } from './utils/publisher';
import { subscribeRemoteFeed, sendData } from './utils/subscriber';
import JanusPlayer from './JanusPlayer';
import JanusChat from './JanusChat';

const JanusSubscriber = ({ janus, opaqueId, room, setPubId, setPubPvtId, username, children }) => {
    const videoArea = useRef(null);
    const [playerState, setPlayerState] = useState("Ready");
    const [sfutest, setSfuTest] = useState(null);
    const [remoteFeed, setRemoteFeed] = useState(null);

    let mystream = null;

    const remoteFeedCallback = (_remoteFeed, eventType, data) => {
        setRemoteFeed(_remoteFeed);
        if (eventType === "onremotestream") {
            mystream = data;
            const videoContainer = videoArea.current;
            const videoPlayer = videoContainer.querySelector(".janus-video-player")

            Janus.attachMediaStream(videoPlayer, mystream);
            if (_remoteFeed.webrtcStuff.pc.iceConnectionState !== "completed" &&
                _remoteFeed.webrtcStuff.pc.iceConnectionState !== "connected") {
                setPlayerState("Live");
            }
            var videoTracks = mystream.getVideoTracks();
            if (videoTracks === null || videoTracks === undefined || videoTracks.length === 0) {
                setPlayerState("Error");
            }
        } else if (eventType === "oncleanup") {
            setPlayerState("Paused");
        } else if (eventType === "error") {
            setPlayerState("Error");
        }
    }

    useEffect(() => {
        if (!janus || !room) {
            return;
        }
        publishToRoom(janus, opaqueId, room, null, null, username, false,
            (_sfutest, eventType, data) => {
                setSfuTest(_sfutest);

                if (eventType === "joined") {
                    if (data.publishers !== undefined && data.publishers !== null) {
                        // we are only consiering one publisher now
                        const list = data.publishers;
                        if (list.length == 0) {
                            return;
                        }

                        setPubId(data.id);
                        setPubPvtId(data.private_id);
                        const publisher = list[0];
                        const { id, display, audio_codec, video_codec } = publisher;
                        subscribeRemoteFeed(janus, opaqueId, room, id, data.private_id, display, audio_codec, video_codec, remoteFeedCallback);
                    }
                } else if (eventType === "publishers") {
                    if (data.publishers !== undefined && data.publishers !== null) {
                        // we are only consiering one publisher now
                        const list = data.publishers;
                        if (list.length == 0) {
                            return;
                        }

                        const publisher = list[0];
                        const { id, display, audio_codec, video_codec } = publisher;
                        subscribeRemoteFeed(janus, opaqueId, room, id, data.private_id, display, audio_codec, video_codec, remoteFeedCallback);
                    }
                } else if (eventType === "leaving" || eventType === "unpublished") {
                    if (remoteFeed !== null) {
                        remoteFeed.detach();
                    }
                }
            }
        );
    }, [janus, room, setPubId, setPubPvtId])

    const playerElement = children ? children : <JanusPlayer />;

    return (
        <div className="janus-subscriber">
            <div className="janus-video">
                {React.cloneElement(playerElement, {
                    ref: videoArea,
                    isPublisher: false,
                    status: playerState
                })}
                {/* <JanusPlayer 
                    ref={videoArea}
                    isPublisher={false}
                    status={playerState}
                /> */}
            </div>
        </div>
    )
};

export default JanusSubscriber;