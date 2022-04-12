/* pages/create-post.js */
import { useState, useRef, useEffect } from 'react' // new
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { css } from '@emotion/css'
import { ethers } from 'ethers'
import { create } from 'ipfs-http-client'
import placeStorageOrder from '../scripts/placeStorageOrder'
// import got from 'got'

/* import contract address and contract owner address */
import {
  contractAddress
} from '../config'

import Blog from '../artifacts/contracts/Blog.sol/Blog.json'

/* define the ipfs endpoint */
// const client = create({host:'https://ipfs.infura.io:5001/api/v0', protocol:'https'});
const client = create('https://ipfs.infura.io:5001/api/v0');
// const client = create('http://localhost:5001/api/v0')
// const pair = ethers.Wallet.createRandom();
// const sig = await pair.signMessage(pair.address);
// const authHeaderRaw = `eth-${pair.address}:${sig}`;
// const authHeader = Buffer.from(authHeaderRaw).toString('base64');
// const ipfsW3GW = 'https://ipfs.infura.io:5001';

// const client = create({
//       url: `${ipfsW3GW}/api/v0`,
//       headers: {
//           authorization: `Basic ${authHeader}`
//       }
//   });


/* configure the markdown editor to be client-side import */
const SimpleMDE = dynamic(
  () => import('react-simplemde-editor'),
  { ssr: false }
)

const initialState = { title: '', content: '' }

function CreatePost() {
  /* configure initial state to be used in the component */
  const [post, setPost] = useState(initialState)
  const [image, setImage] = useState(null)
  const [loaded, setLoaded] = useState(false)

  const fileRef = useRef(null)
  const { title, content } = post
  const router = useRouter()

  useEffect(() => {
    setTimeout(() => {
      /* delay rendering buttons until dynamic import is complete */
      setLoaded(true)
    }, 500)
  }, [])

  function onChange(e) {
    setPost(() => ({ ...post, [e.target.name]: e.target.value }))
  }

  async function createNewPost() {   
    /* saves post to ipfs then anchors to smart contract */
    if (!title || !content) return
    const hash = await savePostToIpfs()
    await savePost(hash)
    router.push(`/`)
  }

  async function savePostToIpfs() {
    /* save post metadata to ipfs */
    try {
      const added = await client.add(JSON.stringify(post))
      return added.path
    } catch (err) {
      console.log('error: ', err)
    }
  }

  async function savePost(hash) {
    /* anchor post to smart contract */
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const contract = new ethers.Contract(contractAddress, Blog.abi, signer)
      console.log('contract: ', contract)
      try {
        const val = await contract.createPost(post.title, hash)
        /* optional - wait for transaction to be confirmed before rerouting */
        /* await provider.waitForTransaction(val.hash) */
        console.log('val: ', val)
      } catch (err) {
        console.log('Error: ', err)
      }
    }    
  }

  function triggerOnChange() {
    /* trigger handleFileChange handler of hidden file input */
    fileRef.current.click()
  }

  async function handleFileChange (e) {
    /* upload cover image to ipfs and save hash to state */
    const uploadedFile = e.target.files[0]
    if (!uploadedFile) return
    const added = await client.add(uploadedFile)
    const fileCid = added.cid.toV0().toString();
    // const fileStat = await client.files.stat("/ipfs/" + fileCid);
    // console.log(fileStat);
    placeStorageOrder(fileCid, 1024*1024);

    setPost(state => ({ ...state, coverImage: added.path }))
    setImage(uploadedFile);
  }

  return (
    <div className={container}>
      {
        image && (
          <a className={coverImageStyle} href={URL.createObjectURL(image)}>File Link</a>
        )
      }
      <input
        onChange={onChange}
        name='title'
        placeholder='Give it a title ...'
        value={post.title}
        className={titleStyle}
      />
      <SimpleMDE
        className={mdEditor}
        placeholder="What's on your mind?"
        value={post.content}
        onChange={value => setPost({ ...post, content: value })}
      />
      {
        loaded && (
          <>
          <button
            onClick={triggerOnChange}
            className={button}
          >Add File to IPFS</button>
            <button
              className={buttonPublish}
              type='button'
              onClick={createNewPost}
            >Publish</button>
          </>
        )
      }
      <input
        id='selectImage'
        className={hiddenInput} 
        type='file'
        onChange={handleFileChange}
        ref={fileRef}
      />
    </div>
  )
}

const hiddenInput = css`
  display: none;
`

const coverImageStyle = css`
  width: 100%;
`

const mdEditor = css`
  margin-top: 20px;
  background-color: white;
  border-radius: 10px;
  &::placeholder {
    color: black;
  }
`

const titleStyle = css`
  width: 100%;
  margin-top: 20px;
  border: none;
  outline: none;
  color: black;
  font-size: 25px;
  border-radius: 10px;
  padding: 10px 10px;
  &::placeholder {
    color: #999999;
  }
`

const container = css`
  width: 100%;
`

const button = css`
  background-color: #fafafa;
  outline: none;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  margin-top: 15px;
  margin-right: 10px;
  font-size: 18px;
  padding: 10px 20px;
  box-shadow: 5px 5px rgba(255, 255, 255, .3);
  transition: all 0.3s ease-in-out;
  :hover {
    border-radius: 20px;
    box-shadow: none;
  }
`
const buttonPublish = css`
  background-color: #00FF00;
  outline: none;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  margin-top: 15px;
  margin-right: 10px;
  font-size: 18px;
  padding: 10px 20px;
  box-shadow: 5px 5px rgba(255, 255, 255, .3);
  transition: all 0.3s ease-in-out;
  :hover {
    border-radius: 20px;
    box-shadow: none;
  }
`

export default CreatePost